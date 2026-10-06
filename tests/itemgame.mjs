// Challenge items (Vampire Killer → Evil Dead · Cabin Defense) must really start their minigame:
// 1) used from the bag before a roll, 2) found on a supply cache and played on the spot.
import {open} from './lib.mjs';
const item=process.env.ITEM||'vampire-killer';let ok=true;
for(const mode of ['bag','found']){
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=async()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){d.querySelector('button.primary,button')?.click();return d.querySelector('h2,h3,.dialog-title')?.textContent||'dialog';}const c=document.querySelector('.level-card,.gentlemen-card');if(c){c.click();return 'card';}return null;});
for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();const ready=await page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open);if(ready&&i>12)break;}
if(mode==='bag'){
 await page.evaluate(id=>{const S=window.ShambConkins,p=S.store.run.players[S.store.run.current];p.items.unshift(id);S.updateBoard(true);},item);
 await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('[data-action=item][data-index="0"]')?.click());
}else{
 await page.evaluate(id=>{const S=window.ShambConkins,run=S.store.run,p=run.players[run.current];const all=S.items.splice(0);S.items.push(...all.filter(i=>i.id===id));window.__restoreItems=()=>{S.items.splice(0);S.items.push(...all);};run.board.obstacles=[];const n=Object.values(run.board.nodes).find(n=>n.type==='item');p.node=n.id;S.focusBoardAction(run);S.updateBoard(true);S.resolveLanding();},item);
 await page.waitForTimeout(900);await page.evaluate(()=>window.__restoreItems());
 await page.screenshot({path:'/tmp/claude-0/sc/found-'+item+'.png'});
}
const seen=[];let started=false;
for(let i=0;i<30;i++){await page.waitForTimeout(400);const t=await click();if(t)seen.push(t);started=await page.evaluate(()=>!!window.ShambConkins.store.session);if(started)break;}
const bag=await page.evaluate(id=>{const run=window.ShambConkins.store.run;return run.players[run.current].items.filter(x=>x===id).length;},item);
console.log(mode,'dialogs',seen,'game',await page.evaluate(()=>window.ShambConkins.store.session?.game?.id),'left in bag',bag,'errors',errors);
ok=ok&&started&&!bag&&!errors.length;await browser.close();}
process.exit(ok?0:1);
