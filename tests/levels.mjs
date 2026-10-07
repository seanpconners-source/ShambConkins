// Starts a run, captures the Level I title card and the board plaque, then
// jumps a player to Level II and checks the card + plaque + drink status.
import {open} from './lib.mjs';
const size=(process.argv[2]||'1100x700').split('x').map(Number),out=process.argv[3]||'/tmp/claude-0/lv';
const {browser,page,errors}=await open({viewport:{width:size[0],height:size[1]}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
let card=false;
for(let i=0;i<40&&!card;i++){await page.waitForTimeout(500);await page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open)d.querySelector('button')?.click();});card=await page.evaluate(()=>!!document.querySelector('.level-card,.gentlemen-card'));}
console.log('level I card shown:',card);
if(card){await page.waitForTimeout(1500);await page.screenshot({path:out+'-card1.png'});console.log(await page.evaluate(()=>(document.querySelector('.level-card,.gentlemen-card')?.innerText||'').replace(/\n+/g,' | ')));}
await page.waitForFunction(()=>!document.querySelector('.level-card,.gentlemen-card'),null,{timeout:8000}).catch(()=>{});
await page.waitForTimeout(700);
await page.screenshot({path:out+'-board1.png'});
console.log('hud:',await page.evaluate(()=>document.getElementById('level-hud')?.innerText.replace(/\n+/g,' | ')));
for(const [realm,node,name] of [['body','body-start','body'],['spirit','spirit-start','spirit'],['horror','horror-0','horror']]){
 await page.evaluate(async([node,realm])=>{const S=window.ShambConkins,run=S.store.run;if(realm==='horror'&&!run.board.nodes['horror-0']){S.addHorrorBoard(run.board);run.horror=true;}
  const p=run.players[0];p.node=node;if(realm==='spirit')run.players[1].node='body-start';S.announceLevel(p);S.updateBoard(true);},[node,realm]);
 await page.waitForTimeout(1600);await page.screenshot({path:out+'-card-'+name+'.png'});
 await page.waitForFunction(()=>!document.querySelector('.level-card,.gentlemen-card'),null,{timeout:9000}).catch(()=>{});
 await page.waitForTimeout(600);await page.screenshot({path:out+'-board-'+name+'.png'});
 console.log(name,'hud:',await page.evaluate(()=>document.getElementById('level-hud')?.innerText.replace(/\n+/g,' | ')));
}
console.log('errors',errors);
await browser.close();
