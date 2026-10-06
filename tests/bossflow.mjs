// Lands a player on the first level gate, fights the boss with the debug autopilot, checks the unlock.
import {open} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:1100,height:700}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){const b=[...d.querySelectorAll('button')].find(b=>/fight|start|continue|ok/i.test(b.innerText))||d.querySelector('button');b?.click();return b?.innerText;}const c=document.querySelector('.level-card');if(c){c.click();return 'card';}return null;});
for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();if(i>12&&await page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card')&&!document.getElementById('dialog').open))break;}
const before=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;S.addBossCheck?.();const g=run.board.realms.mind;return {boss:g.boss,shared:S.store.profile.shared.length};});
console.log('start',before);
await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;const gate=run.board.realms.mind.gate;run.players[run.current].node=gate;S.focusBoardAction(run);S.updateBoard(true);S.resolveLanding();});
let log=[];
for(let i=0;i<40;i++){await page.waitForTimeout(500);const r=await click();if(r)log.push(r);const dbg=await page.evaluate(()=>{const s=window.ShambConkins.store.session;return s&&s.debug&&s.debug.killBoss?(s.debug.skipIntro&&s.debug.skipIntro(),s.debug.killBoss&&s.debug.killBoss(),1):0;});if(dbg)log.push('boss-killed');}
console.log(log.join(' | ').slice(0,500));
console.log(await page.evaluate(()=>{const S=window.ShambConkins;return {shared:S.store.profile.shared.slice(-3),phase:S.store.run.phase,seen:S.store.run.bossesSeen,beaten:S.store.run.bossesBeaten};}));
console.log('errors',errors);await browser.close();
