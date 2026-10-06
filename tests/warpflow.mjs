// Drives the real warp flow: land on a warp pipe, jump in, see the transition, play a turn, reach the boss gate, exit.
import {open} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:1100,height:700}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=async()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){d.querySelector('button.primary,button')?.click();return d.querySelector('h2,h3,.dialog-title')?.textContent||'dialog';}const c=document.querySelector('.level-card');if(c){c.click();return 'levelcard';}return null;});
for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();const ready=await page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card')&&!document.getElementById('dialog').open);if(ready&&i>12)break;}
const info=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;const warp=Object.values(run.board.nodes).find(n=>n.type==='warp');run.players[run.current].node=warp.id;S.focusBoardAction(run);S.updateBoard(true);S.resolveLanding();return {warp:warp.id,format:run.board.format};});
console.log('landed on',info);
for(let i=0;i<30;i++){await page.waitForTimeout(500);const t=await click();const st=await page.evaluate(()=>({fmt:window.ShambConkins.store.run.board.format,fx:!!document.querySelector('.warp-fx')}));if(i===3)await page.screenshot({path:'/tmp/claude-0/warpfx-a.png'});if(st.fmt==='warp'&&!st.fx){console.log('in warp board after',i,'ticks');break;}}
await page.waitForTimeout(800);await page.screenshot({path:'/tmp/claude-0/warpfx-landed.png'});
const st=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;return {fmt:run.board.format,warp:run.warp?.id,nodes:run.players.map(p=>p.node),busy:S.store.busy,phase:run.phase,cur:run.current};});console.log(st);
// roll a few turns normally
for(let k=0;k<3;k++){await page.evaluate(()=>{const b=document.querySelector('[data-action=roll]');if(b&&!b.disabled)b.click();});for(let i=0;i<30;i++){await page.waitForTimeout(400);await click();const ready=await page.evaluate(()=>{const S=window.ShambConkins;return !S.store.busy&&!document.getElementById('dialog').open&&!document.getElementById('game-layer').hidden===false;});if(ready&&i>3)break;}}
console.log('after rolls',await page.evaluate(()=>{const run=window.ShambConkins.store.run;return {nodes:run.players.map(p=>p.node),turn:run.turn,phase:run.phase,gameLayer:!document.getElementById('game-layer').hidden};}));
console.log('errors',errors);await browser.close();
