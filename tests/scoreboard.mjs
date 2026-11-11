// I13 shared scoreboard (src/scores.js + cloudflare/worker.js Scores): needs `npx --yes wrangler@3 dev --local --port 8787`
// in cloudflare/ and a served --pwa build (SHAMB_URL). Checks: the game page shows the record holder from the site; the 🏆
// chip opens the top 10; a finished 1-player run is sent with the player's name; with the site unreachable a run waits in
// the outbox and the page still shows the board as last seen (marked offline); the outbox goes once the site is back.
import {chromium,browserLaunchOptions,appURL} from './lib.mjs';
const URL0=(await appURL()),API=process.env.API||'http://localhost:8787';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const post=(g,b)=>fetch(`${API}/scores/${g}`,{method:'POST',body:JSON.stringify(b)}).then(r=>r.json());
const top=g=>fetch(`${API}/scores/${g}`).then(r=>r.json()).then(r=>r.top);
const tag=Date.now().toString(36);
const browser=await chromium.launch(browserLaunchOptions());
const ctx=await browser.newContext({viewport:{width:390,height:780}});
let host='ws://localhost:8787';await ctx.exposeFunction('__host',()=>host);
await ctx.addInitScript(h=>{try{localStorage.setItem('sc-net-host',h);}catch{}},host);
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(URL0);await page.waitForSelector('.title-screen',{timeout:120000});
await page.evaluate(()=>document.querySelector('[data-action="arcade"]').click());await page.waitForSelector('.arcade-console .arc-tile');
// the record goes on whichever game the Arcade opens on (the first featured game; it changes as games are added), then the page
// moves off it and back so the chip asks the site again
// (groups have no record: focus the first single game on Home)
const SOLO=await page.evaluate(()=>{const ts=[...document.querySelectorAll('.arc-row .arc-tile:not(.arc-tile-all)')];return ts.map((t,i)=>[i,t]).filter(([i,t])=>!t.querySelector('.arc-count')).map(x=>x[0]);});
await page.evaluate(i=>document.querySelectorAll('.arc-row .arc-tile')[i].click(),SOLO[0]);await page.waitForTimeout(500);
const FIRST=await page.evaluate(()=>document.querySelector('.arc-record')?.dataset.arcScores);
await post(FIRST,{name:'Zed'+tag.slice(-3),score:987654,character:'sean',install:'t'+tag});
await page.evaluate(i=>document.querySelectorAll('.arc-row .arc-tile')[i].click(),SOLO[1]);await page.waitForTimeout(500);await page.evaluate(i=>document.querySelectorAll('.arc-row .arc-tile')[i].click(),SOLO[0]);
await page.waitForFunction(()=>{const b=document.querySelector('.arc-record');return b&&!b.hidden;},null,{timeout:15000}).catch(()=>{});
const chip=await page.evaluate(()=>document.querySelector('.arc-record')?.textContent||'');
check(/987,654 · Zed/.test(chip),`record chip shows the site's record: "${chip}"`);
await page.click('.arc-record');await page.waitForSelector('.arc-scores-card li');
check((await page.locator('.arc-scores-card li').count())>=1,'tapping it opens the scoreboard');
check(/every phone/i.test(await page.innerText('.arc-scores-note')),'board says it is every phone\'s best');
await page.screenshot({path:(process.env.SHAMB_SHOTS_DIR||'.')+'/scoreboard.png'});
await page.click('[data-arc-scores-close]');check(await page.evaluate(()=>document.querySelector('.arc-scores')?.hidden!==false),'✕ closes it');
// a finished 1-player run is sent under the player's name
const runAndFinish=async(id,score)=>{await page.evaluate(id=>{void window.ShambConkins.requestGame({id,origin:'arcade',solo:true,quick:true});},id);
 await page.waitForFunction(()=>window.ShambConkins.store.session?.alive,null,{timeout:30000});await page.waitForTimeout(800);
 await page.evaluate(s=>window.ShambConkins.store.session.finish([s,0],'test run'),score);await page.waitForTimeout(2500);
 for(let k=0;k<6&&await page.evaluate(()=>!!document.querySelector('#dialog[open]'));k++){await page.evaluate(()=>{const d=document.querySelector('#dialog[open]');const bs=[...d.querySelectorAll('button')];(bs.find(b=>/back|ok|arcade|continue|nice|great/i.test(b.textContent))||bs.find(b=>b.classList.contains('primary'))||bs[0])?.click();});await page.waitForTimeout(500);}
 if(process.env.DEBUG)console.log('     after run',id,score,await page.evaluate(()=>({out:localStorage.getItem('sc-scores-out'),host:localStorage.getItem('sc-net-host')})));};
const name=await page.evaluate(()=>window.ShambConkins.store.setupNames?.[0]||'Sean');
// the site keeps each name's best, so beat whatever an earlier run left
const S1=Math.max(0,...(await top('pong-duel')).filter(r=>r.name===name).map(r=>r.score))+1000+Math.floor(Math.random()*900);await runAndFinish('pong-duel',S1);
check((await top('pong-duel')).some(r=>r.score===S1&&r.name===name),`a 1-player run of ${S1.toLocaleString()} is on the site as ${name}`);
// offline: the run waits; the page shows the saved board
host='ws://localhost:9';await page.evaluate(()=>localStorage.setItem('sc-net-host','ws://localhost:9'));
const S2=S1+500;await runAndFinish('pong-duel',S2);
const out=await page.evaluate(()=>JSON.parse(localStorage.getItem('sc-scores-out')||'[]'));
check(out.some(e=>e.score===S2),'offline: the run waits in the outbox');
check(!(await top('pong-duel')).some(r=>r.score===S2),'and is not on the site yet');
await page.evaluate(i=>{const t=[...document.querySelectorAll('.arc-row .arc-tile')][i];t.click();},SOLO[0]);await page.waitForTimeout(400);
await page.click('.arc-record');await page.waitForTimeout(1500);
check(/offline/i.test(await page.innerText('.arc-scores-note')),'offline: the board shows the last copy, marked offline');
await page.click('[data-arc-scores-close]');
// back online: the outbox goes on the next start
await page.evaluate(()=>localStorage.setItem('sc-net-host','ws://localhost:8787'));await page.reload();await page.waitForSelector('.title-screen',{timeout:120000});
for(let t=0;t<30&&!(await top('pong-duel')).some(r=>r.score===S2);t++)await page.waitForTimeout(1000);
check((await top('pong-duel')).some(r=>r.score===S2&&r.name===name),'back online: the waiting run reaches the site');
check(await page.evaluate(()=>JSON.parse(localStorage.getItem('sc-scores-out')||'[]').length===0),'and the outbox is empty');
const errs=errors.filter(x=>!/favicon|net::|Failed to load resource|Failed to fetch/.test(x));check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'SCOREBOARD OK');process.exit(bad?1:0);
