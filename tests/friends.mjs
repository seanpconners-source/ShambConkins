// N1 friends online (src/friends.js + cloudflare/worker.js Lobby): needs `npx --yes wrangler@3 dev --local --port 8787`
// in cloudflare/ and a served --pwa build (SHAMB_URL). Two phones (browser contexts): Sean's phone adds Amber's friend code
// in the Play online dialog; Amber's phone gets Sean as a friend by itself; each sees the other as Free; while Amber plays a
// minigame Sean sees "Playing <game>" and an invite waits; when Amber's game ends the invite pops up, Join puts both phones
// in the same room. Then Amber closes the game: Sean sees her offline.
import {chromium,browserLaunchOptions} from './lib.mjs';
const URL0=process.env.SHAMB_URL||'http://localhost:8124/',HOST=process.env.NET_HOST||'ws://localhost:8787';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const browser=await chromium.launch(browserLaunchOptions());
async function phone(who){
 const ctx=await browser.newContext({viewport:{width:390,height:780}});
 await ctx.addInitScript(h=>{try{localStorage.setItem('sc-net-host',h);localStorage.setItem('sc-friends-on','true');}catch{}},HOST);
 const page=await ctx.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.goto(URL0);await page.waitForSelector('.title-screen',{timeout:120000});
 await page.evaluate(w=>{const S=window.ShambConkins;S.store.profile.settings.solo={...(S.store.profile.settings.solo||{}),who:w};S.friends().reconnect();},who);
 await page.waitForFunction(()=>window.ShambConkins.friends().open,null,{timeout:20000});
 return page;
}
const until=async(page,fn,arg,ms=15000)=>page.waitForFunction(fn,arg,{timeout:ms}).then(()=>true,()=>false);
const sean=await phone(0),amber=await phone(1);
const codeA=await amber.evaluate(()=>window.ShambConkins.friends().code),codeS=await sean.evaluate(()=>window.ShambConkins.friends().code);
check(/^[A-HJ-NP-Z2-9]{6}$/.test(codeA)&&codeA!==codeS,`each phone has its own friend code (${codeS}, ${codeA})`);
// Sean opens Online and adds Amber's code (typed with a dash and lower case)
await sean.evaluate(()=>document.querySelector('[data-action="online-home"]').click());
await sean.waitForSelector('#dialog[open] .fr-panel');
check(/no friends yet/i.test(await sean.innerText('#fr-list')),'empty list says how friends get there');
check((await sean.innerText('.fr-code')).replace('-','')===codeS,'dialog shows this phone\'s code');
await sean.fill('#fr-add',(codeA.slice(0,3)+'-'+codeA.slice(3)).toLowerCase());await sean.click('[data-fr="add"]');
check(await until(sean,()=>/Amber/.test(document.getElementById('fr-list')?.innerText||'')),'Sean\'s list shows Amber after adding her code');
check(await until(sean,()=>!!document.querySelector('#fr-list .fr-free .fr-invite')),'Amber shows as Free with an Invite button');
check(await until(amber,c=>window.ShambConkins.friends().friends.some(f=>f.code===c&&f.name==='Sean'),codeS),'Amber\'s phone added Sean back by itself');
check(await until(amber,()=>window.ShambConkins.friends().presence.some(p=>p.st==='free')),'and sees Sean online');
check(await until(amber,()=>/1 friend online/.test(document.querySelector('.ts-online-home small')?.textContent||'')),'Amber\'s Online tile says 1 friend online');
await sean.screenshot({path:(process.env.SHAMB_SHOTS_DIR||'.')+'/friends-list.png'});
// Amber starts a minigame: Sean sees it
await amber.evaluate(()=>{void window.ShambConkins.requestGame({id:'pong-duel',origin:'arcade',solo:true,quick:true});});
await until(amber,()=>window.ShambConkins.store.session?.alive,null,30000);
check(await until(sean,()=>/Playing/.test(document.getElementById('fr-list')?.innerText||'')),`Sean sees Amber playing: "${(await sean.innerText('#fr-list')).replace(/\s+/g,' ').trim()}"`);
// Sean invites; Amber is busy, so it waits
await sean.click('#fr-list .fr-invite');
check(await until(sean,()=>/Inviting Amber/.test(document.querySelector('#dialog[open] h2')?.textContent||'')),'Sean\'s phone shows Inviting Amber…');
check(/busy|free/i.test(await sean.innerText('#dialog[open]')),'and says it pops up when she\'s free');
await amber.waitForTimeout(2500);
check(await amber.evaluate(()=>!/wants to play/.test(document.querySelector('#dialog[open] h2')?.textContent||'')),'no invite card over Amber\'s game');
// Amber's game ends: the card pops up on the result screen's way out
await amber.evaluate(()=>window.ShambConkins.store.session.finish([10,0],'test'));
for(let k=0;k<8;k++){await amber.waitForTimeout(700);
 const h=await amber.evaluate(()=>document.querySelector('#dialog[open] h2')?.textContent||'');if(/wants to play/.test(h))break;
 await amber.evaluate(()=>{const d=document.querySelector('#dialog[open]');if(!d)return;const bs=[...d.querySelectorAll('button')];(bs.find(b=>/back|ok|arcade|continue|nice|great|done/i.test(b.textContent))||bs.find(b=>b.classList.contains('primary'))||bs[0])?.click();});}
check(await until(amber,()=>/Sean wants to play/.test(document.querySelector('#dialog[open] h2')?.textContent||'')),'after her game, Amber gets "Sean wants to play!"');
await amber.screenshot({path:(process.env.SHAMB_SHOTS_DIR||'.')+'/friends-invite.png'});
await amber.evaluate(()=>[...document.querySelectorAll('#dialog[open] button')].find(b=>/join/i.test(b.textContent)).click());
const inRoom=async p=>until(p,()=>{const n=window.ShambConkins.net.state();return !!(n.room&&n.peer);},null,20000);
check(await inRoom(amber)&&await inRoom(sean),'Join puts both phones in a room with each other');
const rooms=await Promise.all([sean,amber].map(p=>p.evaluate(()=>window.ShambConkins.net.state().room)));
check(rooms[0]===rooms[1]&&/^f-/.test(rooms[0]),`same room on both (${rooms.join(' / ')})`);
check(await until(sean,()=>window.ShambConkins.store.view==='arcade'&&window.ShambConkins.store.online),'Sean lands in the Arcade, Online mode');
check(await until(sean,()=>window.ShambConkins.friends().presence.some(p=>p.st==='online')),'friends now see each other as playing online');
// Amber closes the game: Sean sees her go
await amber.context().close();
check(await until(sean,()=>!window.ShambConkins.friends().presence.length,null,20000),'Amber closing the game takes her off Sean\'s online list');
const errs=sean.errors.filter(x=>!/favicon|net::|Failed to load resource|Failed to fetch/.test(x));check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'FRIENDS OK');process.exit(bad?1:0);
