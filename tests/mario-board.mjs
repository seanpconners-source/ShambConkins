// Super Mario Bros. from the board on one phone (owner, Nov 21): co-op, one life each. It starts in the furthest world this
// board game has reached (run.smbWorld); when one player dies the other carries on from the same stage; it ends when both
// have died, highest score wins, and the furthest world is saved on the run for next time.
import {launchBrowser,appURL} from './lib.mjs';
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);},pass=m=>console.log('  ok  ',m);
const browser=await launchBrowser();const page=await browser.newPage({viewport:{width:844,height:390}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(await appURL(),{waitUntil:'domcontentloaded',timeout:90000});
await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){d.querySelector('button.primary,button')?.click();return true;}const c=document.querySelector('.level-card,.gentlemen-card,.smash-card');if(c){c.click();return true;}return false;});
for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();const ready=await page.evaluate(()=>!!window.ShambConkins.store.run&&!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open);if(ready)break;}
await page.evaluate(()=>{const S=window.ShambConkins;S.store.run.smbWorld=3;S.requestGame({id:'smb-world-1',origin:'board'});});
await page.waitForTimeout(700);await page.evaluate(()=>[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click());
const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;return d&&{phase:d.phase,turn:d.turn,two:d.twoPlayer,pl:d.pl.map(p=>({st:p.stage,lives:p.lives,over:p.over,check:p.checkOn,score:p.score}))};});
const until=async(fn,ms=12000)=>{const t0=Date.now();let d;while(Date.now()-t0<ms){d=await D();if(d&&fn(d))return d;await page.evaluate(()=>{document.querySelector('.pass-overlay [data-ready]')?.click();const d=window.ShambConkins.store.session?.debug;if(d?.phase==='card')d.skipCard();});await page.waitForTimeout(150);}return d;};
await page.waitForTimeout(600);await page.screenshot({path:(process.env.OUT||'/tmp/claude-0/sc')+'/smb-board-title.png'});
let d=await until(d=>d.phase==='play'&&d.turn===0);
if(!d||d.pl[0].st!==8)fail('should start in World 3-1: '+JSON.stringify(d));else pass('starts in World 3-1 (furthest world of this board game)');
if(d.pl.some(p=>p.lives!==1))fail('one life each: '+JSON.stringify(d.pl));else pass('one life each');
// Sean gets to 3-2, past its checkpoint, scores and dies there: Amber takes over at the same spot
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(0,40,9);const p=d.pl[0];p.checkOn=true;p.score=4200;});await page.waitForTimeout(300);
await page.evaluate(()=>window.ShambConkins.store.session.debug.kill(0));
d=await until(d=>d.phase==='play'&&d.turn===1,15000);
if(!d||d.turn!==1)fail('Amber should take over: '+JSON.stringify(d));else if(d.pl[1].st!==9||!d.pl[1].check)fail('Amber should carry on in 3-2 from the checkpoint: '+JSON.stringify(d.pl[1]));else pass('Amber carries on in 3-2 from the checkpoint');
const furthest=await page.evaluate(()=>window.ShambConkins.store.run.smbWorld);
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(1,40,13);d.pl[1].score=1500;});
await page.evaluate(()=>window.ShambConkins.store.session.debug.kill(1));
let res=null;for(let i=0;i<80&&!res;i++){await page.waitForTimeout(300);await page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(d?.phase==='card')d.skipCard();});res=await page.evaluate(()=>{const d=document.getElementById('dialog');return d?.open?d.innerText.replace(/\s+/g,' ').slice(0,300):null;});}
if(!res)fail('no result after both died');else{console.log('  result:',res.slice(0,160));if(!/takes it|wins/i.test(res))fail('result should name a winner');else pass('both died → result');}
const w=await page.evaluate(()=>window.ShambConkins.store.run.smbWorld);if(w!==4)fail('furthest world should be 4 (Amber reached 4-2), got '+w+' (after Sean '+furthest+')');else pass('furthest world saved on the run: '+w);
if(errors.length)fail('page errors: '+errors.join(' ; '));
await browser.close();console.log(ok?'mario board OK':'mario board FAILED');process.exit(ok?0:1);
