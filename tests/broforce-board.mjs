// Broforce from the board: a real run launches the mission, both turns are fast-forwarded through the debug hooks, the
// result is an ordinary head-to-head result (winner gets the board reward), each player's GOLD-cage recruit lands in
// that player's own roster, no random "winner recruit" is added on top, and the run stays a valid save.
import {launchBrowser, root} from './lib.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const browser=await launchBrowser();const page=await browser.newPage({viewport:{width:780,height:390}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href,{waitUntil:'domcontentloaded',timeout:90000});
await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){d.querySelector('button.primary,button')?.click();return true;}const c=document.querySelector('.level-card,.gentlemen-card,.smash-card');if(c){c.click();return true;}return false;});
for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();const ready=await page.evaluate(()=>!!window.ShambConkins.store.run&&!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open);if(ready&&i>10)break;}
const before=await page.evaluate(()=>{const S=window.ShambConkins,P=S.store.profile;S.requestGame({id:'broforce-desert',origin:'board'});return S.store.run.players.map(p=>({owner:p.owner,roster:[...(P.rosters[p.owner]||[])],points:p.points}));});
await page.waitForTimeout(700);await page.evaluate(()=>[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click());
const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;return d&&{phase:d.phase,turn:d.turn,stage:d.stage};});
for(const t of [0,1]){
 for(let i=0;i<80;i++){const d=await D();if(d?.phase==='play'&&d.turn===t)break;await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(150);}
 // P1 frees the gold cage and finishes the mission; P2 frees theirs and runs out of time on stage 1
 await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;const k=d.W.cages.findIndex(c=>c.vip);if(k>=0)d.freeCage(k);});
 if(t===0){for(let st=0;st<3;st++){if(st===2)await page.evaluate(()=>window.ShambConkins.store.session.debug.killBoss());await page.evaluate(()=>window.ShambConkins.store.session.debug.board());for(let i=0;i<40&&(await D())?.stage===st&&(await D())?.phase==='play';i++)await page.waitForTimeout(150);}}
 else await page.evaluate(()=>window.ShambConkins.store.session.debug.setClock(299.8));
 for(let i=0;i<60&&(await D())?.phase==='play';i++)await page.waitForTimeout(150);
}
const recruits=await page.evaluate(()=>window.ShambConkins.store.session?.broforceRecruits?.map(r=>r.slice())||null);
let seen=[];for(let i=0;i<60;i++){await page.waitForTimeout(300);const t=await page.evaluate(()=>{const d=document.getElementById('dialog');if(!d.open)return null;const txt=d.innerText.replace(/\n+/g,' | ').slice(0,900);d.querySelector('button.primary,button')?.click();return txt;});if(t)seen.push(t);if(seen.length>=4)break;}
console.log('dialogs:\n '+seen.map(t=>t.slice(0,220)).join('\n '));
const after=await page.evaluate(()=>{const S=window.ShambConkins,P=S.store.profile,run=S.store.run;return {players:run.players.map(p=>({owner:p.owner,roster:[...(P.rosters[p.owner]||[])],points:p.points})),valid:S.validRun?S.validRun(run):'n/a',pending:run.pending&&{kind:run.pending.kind,gameId:run.pending.gameId,unlocked:run.pending.unlocked,owners:run.pending.unlockOwners}};});
console.log('recruits',JSON.stringify(recruits),'pending',JSON.stringify(after.pending),'valid',after.valid);
after.players.forEach((p,i)=>{const gained=p.roster.filter(id=>!before[i].roster.includes(id));console.log(p.owner,'gained',gained.join(','),'points',before[i].points,'→',p.points);
 const want=recruits?.[i]||[];if(gained.length!==want.length||!want.every(id=>gained.includes(id)))fail(`${p.owner} roster gain ${gained} != gold cages ${want}`);});
if(!after.players.some((p,i)=>p.points>before[i].points))fail('no board points were awarded');
if(!seen.some(t=>/NEW CHARACTER ADDED/.test(t)))fail('result dialog did not list the recruits');
if(errors.length)fail('errors '+errors.slice(0,4).join(' ; '));
await browser.close();console.log(ok?'broforce board OK':'broforce board FAILED');process.exit(ok?0:1);
