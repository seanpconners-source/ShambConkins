// Pause card → ↻ Restart (gameLauncher restartGame): the same game starts again from the beginning, no Start card, no result.
// Arcade games (2P and 1P) and a board minigame. SHAMB_URL=http://localhost:8123/ for a --pwa build.
import {open} from './lib.mjs';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.waitForSelector('.title-screen',{timeout:120000});
const sess=()=>page.evaluate(()=>{const s=window.ShambConkins.store.session;if(!s)return null;s.__tag??=Math.random();return {tag:s.__tag,id:s.game.id,alive:s.alive,restart:!!s.restart,paused:s.paused};});
async function pauseAndRestart(label){
 await page.evaluate(()=>{window.ShambConkins.store.session.manualPause();});await page.waitForSelector('.pass-overlay [data-action="restart-game"]',{timeout:10000});
 const before=await sess();
 await page.click('.pass-overlay [data-action="restart-game"]');await page.waitForSelector('#dialog[open]');
 // "Keep playing" first: nothing changes
 await page.evaluate(()=>{[...document.querySelectorAll('#dialog[open] button')].find(b=>/keep/i.test(b.textContent)).click();});await page.waitForTimeout(400);
 check((await sess())?.tag===before.tag,`${label}: Keep playing keeps the same game`);
 await page.click('.pass-overlay [data-action="restart-game"]');await page.waitForSelector('#dialog[open]');
 await page.evaluate(()=>{[...document.querySelectorAll('#dialog[open] button')].find(b=>/^restart/i.test(b.textContent.trim())).click();});
 await page.waitForFunction(t=>{const s=window.ShambConkins.store.session;return s&&s.alive&&s.__tag!==t;},before.tag,{timeout:20000}).catch(()=>{});
 const after=await sess();
 check(after&&after.tag!==before.tag&&after.id===before.id&&after.alive,`${label}: a fresh ${before.id} is running`);
 check(!(await page.evaluate(()=>!!document.querySelector('#dialog[open]'))),`${label}: no Start card or result in between`);
 return after;}
for(const [id,solo] of [['pong-duel',false],['django-hangman',false],['space-swarm-versus',true]]){
 await page.evaluate(([id,solo])=>{void window.ShambConkins.requestGame({id,origin:'arcade',quick:true,solo});},[id,solo]);
 await page.waitForFunction(()=>window.ShambConkins.store.session?.alive,null,{timeout:30000});await page.waitForTimeout(1500);
 // past the get-ready card (1P games count down first)
 for(let t=0;t<30&&await page.evaluate(()=>window.ShambConkins.store.session?.waiting);t++){await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(500);}
 check((await sess()).restart,`${id}${solo?' (1P)':''}: offers Restart`);
 await pauseAndRestart(id+(solo?' (1P)':''));
 await page.evaluate(()=>{window.ShambConkins.store.session?.dispose();window.ShambConkins.store.session=null;window.ShambConkins.store.busy=false;});await page.waitForTimeout(300);
}
// a board minigame: restart keeps the board's pending game and settles normally afterwards
const act=a=>page.evaluate(a=>{const b=document.createElement('button');b.dataset.action=a;document.body.append(b);b.click();b.remove();},a);
await page.evaluate(()=>{const s=window.ShambConkins;s.store.profile.settings.reducedMotion=true;document.body.classList.add('reduced-motion');});
await act('setup');await page.waitForSelector('.setup-shell');await act('start-run');
await page.waitForFunction(()=>document.body.dataset.view==='board'&&!!window.ShambConkins.store.run,null,{timeout:30000});
for(let t=0;t<40;t++){const busy=await page.evaluate(()=>{const d=document.querySelector('#dialog[open]');if(d){d.querySelector('button.primary,button')?.click();return true;}return window.ShambConkins.store.busy;});if(!busy)break;await page.waitForTimeout(500);}
await page.evaluate(()=>{const S=window.ShambConkins;S.store.busy=false;void S.requestGame({id:'pong-duel',origin:'board'});});await page.waitForTimeout(1500);
await page.evaluate(()=>{[...document.querySelectorAll('#dialog[open] button')].find(b=>/start|play|ready/i.test(b.textContent))?.click();});
await page.waitForFunction(()=>window.ShambConkins.store.session?.alive,null,{timeout:30000}).catch(()=>{});
for(let t=0;t<30&&await page.evaluate(()=>window.ShambConkins.store.session?.waiting);t++){await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(500);}
const bs=await sess();check(bs?.id==='pong-duel'&&bs.restart,'board game: offers Restart'+JSON.stringify(bs));
if(bs?.restart){await pauseAndRestart('board pong-duel');
 check(await page.evaluate(()=>window.ShambConkins.store.run?.pending?.kind==='game'&&window.ShambConkins.store.run.pending.gameId==='pong-duel'),'board: the run still waits for this game');
 await page.evaluate(()=>window.ShambConkins.store.session.finish([3,1],'test'));await page.waitForTimeout(1500);
 check(await page.evaluate(()=>window.ShambConkins.store.run?.pending?.kind==='result'||!!document.querySelector('#dialog[open]')),'board: finishing the restarted game settles it');}
const errs=errors.filter(x=>!/favicon|net::|Failed to load resource/.test(x));check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'RESTART OK');process.exit(bad?1:0);
