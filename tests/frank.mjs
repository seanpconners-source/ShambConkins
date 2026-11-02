// Frank's fake-out (ROADMAP E2/E3): the FRANK card in Level III → Shits and Ladders laxative dialogs (one per player) → the
// melt / "I don't think that was a laxative" / Frank's face → both players at the start of Level IV, Level III boss skipped.
// SHAMB_URL=... node tests/frank.mjs   (screens → local-test-reports/screenshots/frank-*.png)
import {open, screenshotPath} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){const b=d.querySelector('button.primary')||d.querySelector('button');const h=(d.querySelector('h2,h3')?.innerText||'');b?.click();return h+' > '+b?.innerText;}const c=document.querySelector('.level-card,.gentlemen-card,.boss-card,.smash-card');if(c){c.click();return 'card';}return '';});
const settle=async(n=40)=>{for(let i=0;i<n;i++){await page.waitForTimeout(400);await click();if(i>3&&await page.evaluate(()=>!window.ShambConkins.store.busy&&window.ShambConkins.store.run.phase==='board'&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open))return;}};
await settle();
let bad=0;const expect=(ok,msg)=>{console.log(ok?'ok  ':'FAIL',msg);if(!ok)bad++;};
// both players in the middle of Level III (Spirit), Body cleared
await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;for(const q of run.players){q.cleared=['mind','body'];q.levelsSeen=['mind','body','spirit'];q.node='spirit-start';q.visited=[];}run.current=0;run.phase='board';run.pending=null;S.store.busy=false;S.updateBoard(true);
 const ev=S.rareEvents.find(e=>e.e?.[0]==='horror')||{title:'FRANK',source:'Always Sunny',body:'Frank has been waiting for you.',e:['horror'],rare:true};void S.resolveEvent({...ev,rare:true});});
const seen=[];
for(let i=0;i<8;i++){await page.waitForTimeout(400);const r=await click();if(r)seen.push(r);if(await page.$('#frank-reveal'))break;}
console.log(' dialogs:',seen.join(' | '));
expect(seen.filter(t=>/SHITS AND LADDERS/i.test(t)).length===2,'two laxative dialogs (one per player)');
await page.waitForTimeout(1500);await page.screenshot({path:screenshotPath('frank-melt.png')});
await page.waitForTimeout(2600);await page.screenshot({path:screenshotPath('frank-line.png')});
await page.waitForTimeout(2600);await page.screenshot({path:screenshotPath('frank-face.png')});
expect(!!await page.$('#frank-reveal'),'the reveal overlay is playing');
for(let i=0;i<30&&await page.$('#frank-reveal');i++)await page.waitForTimeout(300);
await page.waitForTimeout(400);await page.screenshot({path:screenshotPath('frank-level4.png')});
await settle(25);
const r=await page.evaluate(()=>{const run=window.ShambConkins.store.run;return {nodes:run.players.map(p=>p.node),realms:run.players.map(p=>run.board.nodes[p.node].realm),start:run.board.realms.horror?.start,boss:run.bossGate,melt:document.body.classList.contains('frank-melt')};});
expect(r.realms.every(x=>x==='horror')&&r.nodes.every(n=>n===r.start),`both players at the Level IV start: ${r.nodes} (${r.realms})`);
expect(!r.boss&&!r.melt,'no Level III boss pending, melt cleared');
expect(errors.length===0,'no page errors '+errors.join(' | '));
await browser.close();process.exit(bad?1:0);
