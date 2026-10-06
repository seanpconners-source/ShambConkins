// Lands on a shop, screenshots it (phone + desktop), buys the first item and checks points/bag update.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';
for(const vp of [{width:390,height:780},{width:1100,height:700}]){
const {browser,page,errors}=await open({viewport:vp});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=async()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){d.querySelector('button.primary,button')?.click();return d.querySelector('h2,h3,.dialog-title')?.textContent||'dialog';}const c=document.querySelector('.level-card,.gentlemen-card');if(c){c.click();return 'card';}return null;});
for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();const ready=await page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open);if(ready&&i>12)break;}
const before=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run,p=run.players[run.current];p.points=20;const shop=Object.values(run.board.nodes).find(n=>n.type==='shop')||Object.values(run.board.nodes).find(n=>n.type==='item');shop.type='shop';p.node=shop.id;S.focusBoardAction(run);S.updateBoard(true);S.resolveLanding();return {items:p.items.length,points:p.points};});
await page.waitForTimeout(1200);
await page.screenshot({path:`${out}/shop-${vp.width}.png`});
const buy=await page.evaluate(()=>{const b=document.querySelector('#dialog .dialog-actions button');b?.click();return b?.textContent.slice(0,60);});
await page.waitForTimeout(800);await page.screenshot({path:`${out}/shop-after-${vp.width}.png`});
for(let i=0;i<6;i++){await page.waitForTimeout(400);await click();}
const after=await page.evaluate(()=>{const run=window.ShambConkins.store.run,p=run.players.find(p=>p.points!==undefined&&p.items);return run.players.map(p=>({items:p.items.length,points:p.points}));});
console.log(vp.width,'bought',buy,'before',before,'after',after,'errors',errors);
await browser.close();}
