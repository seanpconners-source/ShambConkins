// Screenshots every warp board and drives the real warp flow (enter, walk, boss gate, exit).
// Usage: node tests/warp.mjs [WxH]   (SHAMB_FILE overrides the build)
import {open} from './lib.mjs';
const size=(process.argv[2]||'1100x700').split('x').map(Number),out='/tmp/claude-0/warp';
const {browser,page,errors}=await open({viewport:{width:size[0],height:size[1]}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
for(let i=0;i<40;i++){await page.waitForTimeout(400);const ready=await page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){d.querySelector('button')?.click();return false;}return !!document.querySelector('[data-action=roll]')&&!document.querySelector('.level-card,.gentlemen-card')&&!window.ShambConkins.store.busy;});if(ready)break;}
const WARPS=['rainbow-road','candy-land','chutes','monopoly','mario-world','clue','hyrule','green-hill','castlevania'];
for(const id of WARPS){
 await page.evaluate(async id=>{const S=window.ShambConkins,run=S.store.run;if(!run.mainBoard){run.mainBoard=run.board;}const b=S.buildWarpBoard(id,'shot');b.warp.bossName='Test Boss';run.board=b;run.warp={id,returns:run.players.map(()=>'mind-start')};run.players[0].node=b.realms.warp.ids[3];run.players[1].node=b.realms.warp.ids[2];run.camera='follow';S.focusBoardAction(run,run.players.map(p=>p.node));S.updateBoard(true);},id);
 await page.waitForTimeout(1400);await page.screenshot({path:`${out}-${id}.png`});
 await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;run.camera='overview';S.updateBoard(true);});await page.waitForTimeout(1400);await page.screenshot({path:`${out}-${id}-ov.png`});
 await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;run.board=run.mainBoard;delete run.mainBoard;run.warp=null;run.players.forEach(p=>p.node='mind-start');run.camera='follow';S.updateBoard(true);});await page.waitForTimeout(1400);
}
console.log('errors',errors);await browser.close();
