// Endings (ROADMAP E10-E13): Level III finish → the fake ending; Level IV finish → the true ending with lore and credits;
// Skip asks first. SHAMB_URL=... node tests/endings.mjs   (screens → local-test-reports/screenshots/ending-*.png)
import {open, screenshotPath} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){(d.querySelector('button.primary')||d.querySelector('button'))?.click();return 1;}const c=document.querySelector('.level-card,.gentlemen-card,.boss-card,.smash-card');if(c){c.click();return 1;}return 0;});
for(let i=0;i<30;i++){await page.waitForTimeout(400);await click();if(i>3&&await page.evaluate(()=>!window.ShambConkins.store.busy&&window.ShambConkins.store.run?.phase==='board'&&!document.getElementById('dialog').open))break;}
let bad=0;const expect=(ok,msg)=>{console.log(ok?'ok  ':'FAIL',msg);if(!ok)bad++;};
const finish=realms=>page.evaluate(r=>{const S=window.ShambConkins,run=S.store.run;run.finished=false;for(const q of run.players){q.cleared=r;q.finishedPlayer=true;}S.store.busy=false;S.finishRun();},realms);
// fake ending
await finish(['mind','body','spirit']);await page.waitForTimeout(700);
expect(await page.$('.ending.fake'),'Level III finish plays the fake ending');
await page.waitForTimeout(3500);await page.screenshot({path:screenshotPath('ending-fake.png')});
await page.click('.en-skip');await page.waitForTimeout(200);
expect(await page.evaluate(()=>!document.querySelector('.en-confirm').hidden),'Skip asks first');
await page.click('.en-keep');await page.waitForTimeout(200);
expect(await page.$('.ending.fake')&&await page.evaluate(()=>document.querySelector('.en-confirm').hidden),'Keep watching carries on');
await page.click('.en-skip');await page.click('.en-yes');await page.waitForTimeout(800);
expect(!await page.$('.ending')&&await page.evaluate(()=>window.ShambConkins.store.view==='finished'),'Skip it → results screen');
// true ending
await finish(['mind','body','spirit','horror']);await page.waitForTimeout(700);
expect(await page.$('.ending.true'),'Level IV finish plays the true ending');
await page.waitForTimeout(7200);await page.screenshot({path:screenshotPath('ending-true-walk.png')});
for(let i=0;i<40&&!(await page.$('.en-talk'));i++)await page.waitForTimeout(300);
await page.waitForTimeout(2500);await page.screenshot({path:screenshotPath('ending-true-lore.png')});
expect(!!await page.$('.en-talk'),'the players trade made-up lore');
for(let i=0;i<80&&!(await page.$('.en-roll'));i++)await page.waitForTimeout(400);
await page.waitForTimeout(4000);await page.screenshot({path:screenshotPath('ending-true-credits.png')});
expect(!!await page.$('.en-roll'),'credits roll');
for(let i=0;i<80&&await page.$('.ending');i++)await page.waitForTimeout(500);
expect(await page.evaluate(()=>window.ShambConkins.store.view==='finished'),'results screen after THE END');
expect(errors.length===0,'no page errors '+errors.join(' | '));
await browser.close();process.exit(bad?1:0);
