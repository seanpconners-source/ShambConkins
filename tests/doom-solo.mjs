// DOOM in 1P (solo arcade): the full game flow. Starts E1M1 from the menu, exits, checks the tally leads to E1M2 and
// the run's score is banked, then dies and checks the level restarts (vanilla) instead of ending the run.
// Usage: node tests/doom-solo.mjs [doom|doom-2]
import {open} from './lib.mjs';
const id=process.argv[2]||'doom',out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const {browser,page,errors}=await open({viewport:{width:844,height:390}});
const act=v=>page.evaluate(v=>{const b=document.createElement('button');b.dataset.action=v;document.body.append(b);b.click();b.remove();},v);
await page.evaluate(()=>{window.ShambConkins.store.profile.settings.solo={on:true,who:0,level:'normal'};});await act('arcade');await page.waitForTimeout(300);
await page.evaluate(id=>{const b=document.createElement('button');b.dataset.action='arcade-solo';b.dataset.id=id;document.body.append(b);b.click();b.remove();},id);
await page.waitForTimeout(400);await page.click('#dialog button.primary');
for(let i=0;i<10;i++){await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]:not(:disabled)')?.click());}
for(let i=0;i<60;i++){await page.waitForTimeout(250);if(await page.evaluate(()=>!!window.ShambConkins.store.session?.debug?.app))break;}
const D=()=>page.evaluate(()=>{const s=window.ShambConkins.store.session,d=s?.debug;return d?.app?{solo:!!s.solo,two:d.app.twoPlayer,state:d.state,map:d.game.gamemap,progress:s.soloProgress,total:d.app.soloTotal,hp:d.game.players?.[0]?.health}:null;});
let d=await D();if(!d?.solo||d.two)fail('not a solo session '+JSON.stringify(d));
// through the real menus: New Game -> episode 1 -> Hurt me plenty
await page.keyboard.press('Enter');await page.waitForTimeout(300);await page.keyboard.press('Enter');await page.waitForTimeout(300);
if(id==='doom'){await page.keyboard.press('Enter');await page.waitForTimeout(300);}
await page.screenshot({path:`${out}/doomsolo-skill.png`});await page.keyboard.press('Enter');
for(let i=0;i<20;i++){await page.waitForTimeout(300);if((await D()).state==='level')break;}
d=await D();console.log('start',JSON.stringify(d));if(d.state!=='level'||d.map!==1)fail('level 1 did not start from the menus');
await page.evaluate(()=>window.ShambConkins.store.session.debug.exit());await page.waitForTimeout(800);
for(let i=0;i<14;i++){await page.keyboard.press('Enter');await page.waitForTimeout(350);if((await D()).state==='level')break;}
d=await D();console.log('next',JSON.stringify(d));if(d.state!=='level'||d.map!==2)fail('did not move on to level 2');if(!(d.progress?.level===1&&d.progress.score>0))fail('run not banked');
await page.screenshot({path:`${out}/doomsolo-map2.png`});
await page.evaluate(()=>window.ShambConkins.store.session.debug.kill());await page.waitForTimeout(1500);await page.keyboard.press('Enter');await page.waitForTimeout(1500);
d=await D();console.log('after death',JSON.stringify(d));if(d.state!=='level'||d.map!==2||d.hp!==100)fail('death did not restart the level');
if(errors.length)fail('page errors: '+errors.join(' | '));await browser.close();console.log(ok?'doom-solo OK':'doom-solo FAILED');process.exit(ok?0:1);
