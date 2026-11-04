// Item cut-in (ROADMAP F5, src/itemFx.js) + board items (F6, src/boardMarks.js) in the real game. Starts a board game,
// uses items from the bag through the UI and checks the full-screen cut-in: points count up, an attack shakes the
// opponent, a ward shows BLOCKED!, a roadblock shows on the board and stops the opponent, coins pop a COINS! stamp.
// Screenshots to SHAMB_SHOTS_DIR (item-fx-*.png). SHAMB_URL = a served --pwa build (the one-file build is too big).
import {open} from './lib.mjs';
const SHOTS=process.env.SHAMB_SHOTS_DIR||'/tmp';
let bad=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)bad++;};
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=async()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){d.querySelector('button.primary,button')?.click();return 'dialog';}const c=document.querySelector('.level-card,.gentlemen-card,.smash-card');if(c){c.click();return 'card';}return null;});
for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();const ready=await page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open&&window.ShambConkins.store.run?.phase==='board');if(ready&&i>8)break;}
check(await page.evaluate(()=>window.ShambConkins.store.run?.phase==='board'),'a board game is waiting for a roll');
// use an item from the bag through the UI; returns what the cut-in showed
async function useItem(id,prep=''){
 await page.evaluate(([id,prep])=>{const S=window.ShambConkins,run=S.store.run,p=run.players[run.current];p.itemUsedTurn=-1;p.items.unshift(id);if(prep)new Function('run',prep)(run);S.updateBoard(true);},[id,prep]);
 await page.waitForTimeout(250);await page.evaluate(()=>document.querySelector('[data-action=item][data-index="0"]')?.click());
 await page.waitForSelector('#dialog[open]');await page.evaluate(()=>[...document.querySelectorAll('#dialog[open] button')].find(b=>/use/i.test(b.textContent))?.click());
 await page.waitForSelector('#ifx.ifx-on .ifx-card',{timeout:5000});await page.waitForTimeout(1900);
 const seen=await page.evaluate(()=>{const c=document.querySelector('#ifx .ifx-card');return {name:c.querySelector('.ifx-name')?.textContent,cls:c.className,hits:[...c.querySelectorAll('.ifx-hit')].map(h=>({cls:h.className,big:h.querySelector('.ifx-big')?.textContent||'',stamps:[...h.querySelectorAll('.ifx-stamps em')].map(x=>x.textContent),blocked:!!h.querySelector('.ifx-block')})),msg:c.querySelector('.ifx-msg')?.textContent};});
 await page.screenshot({path:`${SHOTS}/item-fx-${id}.png`});
 await page.mouse.click(195,700);await page.waitForFunction(()=>!document.querySelector('#ifx .ifx-card'),null,{timeout:5000}).catch(()=>{});
 for(let k=0;k<4&&await page.evaluate(()=>document.getElementById('dialog').open);k++){await click();await page.waitForTimeout(300);}
 await page.waitForFunction(()=>!window.ShambConkins.store.busy,null,{timeout:5000}).catch(()=>{});
 return seen;
}
const rum=await useItem('rum-ham');
check(/rum ham/i.test(rum.name)&&rum.cls.includes('ifx-points'),`points item: "${rum.name}" cut-in in the points colour`);
check(rum.hits.some(h=>h.big==='+4'&&h.cls.includes('good')),`its +4 counts up on the user (${JSON.stringify(rum.hits.map(h=>h.big))})`);
const push=await useItem('dennis-tools','run.players[1-run.current].points=9;run.players[1-run.current].shields=0');
check(push.cls.includes('ifx-attack')&&push.hits.some(h=>h.cls.includes('bad')&&h.big==='-3'),`an attack shows the opponent hit, red and shaking (${JSON.stringify(push.hits.map(h=>h.big))})`);
const ward=await useItem('force-push','run.players[1-run.current].ward=1');
check(ward.hits.some(h=>h.blocked),'a ward shows BLOCKED! on the defender');
const block=await useItem('cone');
check(/roadblock/i.test(block.msg),`roadblock text: "${block.msg}"`);
const marks=await page.evaluate(()=>document.querySelectorAll('.board-mark.mark-block').length);
check(marks>=1,`the roadblock is drawn on the board (${marks})`);
await page.screenshot({path:`${SHOTS}/item-fx-board.png`});
await useItem('cheesy-poofs');
check(await page.evaluate(()=>document.querySelectorAll('.board-mark.mark-coin').length>=1),'coin stacks are drawn on the board');
// the opponent rolls and walks into the roadblock (or a coin) on the way
const before=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;return {cur:run.current,marks:run.marks.length};});
let stamp=null;
for(let t=0;t<3&&!stamp;t++){
 await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;run.players[run.current].rollFixed=3;S.roll();});
 for(let k=0;k<40&&!stamp;k++){await page.waitForTimeout(150);stamp=await page.evaluate(()=>document.querySelector('#ifx .ifx-mini b')?.textContent||null);if(!stamp&&await page.evaluate(()=>!!document.querySelector('.route-panel.open, #dialog[open]')))await page.evaluate(()=>{(document.querySelector('.route-panel.open button')||document.querySelector('#dialog[open] button.primary,#dialog[open] button'))?.click();});}
 if(stamp)await page.screenshot({path:`${SHOTS}/item-fx-stamp.png`});
 for(let k=0;k<20&&!(await page.evaluate(()=>window.ShambConkins.store.run.phase==='board'&&!window.ShambConkins.store.busy));k++){await click();await page.waitForTimeout(400);}
}
check(!!stamp,`walking into a mark shows its stamp (${stamp})`);
const errs=errors.filter(x=>!/favicon|net::|Failed to load resource|Failed to fetch/.test(x));check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'ITEM FX OK');process.exit(bad?1:0);
