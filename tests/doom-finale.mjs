// DOOM endings in 1P: E1M8 exit -> text screen -> end picture (Doom), MAP30 exit -> tally -> text -> cast call (Doom II).
// Screenshots: OUT (default /tmp/claude-0/sc/doomfin-*). Usage: node tests/doom-finale.mjs
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
for(const [id,ep,map] of [['doom',1,8],['doom-2',1,30]]){
 const {browser,page,errors}=await open({viewport:{width:844,height:390}});
 const act=v=>page.evaluate(v=>{const b=document.createElement('button');b.dataset.action=v;document.body.append(b);b.click();b.remove();},v);
 await page.evaluate(()=>{window.ShambConkins.store.profile.settings.solo={on:true,who:0,level:'normal'};});await act('arcade');await page.waitForTimeout(300);
 await page.evaluate(id=>{const b=document.createElement('button');b.dataset.action='arcade-solo';b.dataset.id=id;document.body.append(b);b.click();b.remove();},id);
 await page.waitForTimeout(400);await page.click('#dialog button.primary');
 for(let i=0;i<40;i++){await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]:not(:disabled)')?.click());if(await page.evaluate(()=>!!window.ShambConkins.store.session?.debug?.app))break;}
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;return d?.app?{state:d.state,map:d.game.gamemap,fin:d.finale}:{gone:true};});
 await page.evaluate(([ep,map])=>window.ShambConkins.store.session.debug.warp(ep,map),[ep,map]);await page.waitForTimeout(1500);
 await page.evaluate(()=>window.ShambConkins.store.session.debug.exit());
 for(let i=0;i<40;i++){await page.waitForTimeout(300);const d=await D();if(d.state==='finale')break;if(d.state==='inter')await page.keyboard.press('Enter');}
 await page.waitForTimeout(2500);await page.screenshot({path:`${out}/doomfin-${id}-text.png`});let d=await D();console.log(id,JSON.stringify(d));if(d.state!=='finale')fail(id+' no finale');
 await page.keyboard.press('Enter');await page.waitForTimeout(300);await page.keyboard.press('Enter');await page.waitForTimeout(2500);
 await page.screenshot({path:`${out}/doomfin-${id}-end.png`});d=await D();console.log(id,JSON.stringify(d));
 if(id==='doom-2'&&d.fin?.stage!=='cast')fail('no cast call');
 if(id==='doom-2'){await page.keyboard.press('Enter');await page.waitForTimeout(1200);await page.screenshot({path:`${out}/doomfin-${id}-cast2.png`});}
 if(errors.length)fail(id+' page errors: '+errors.join(' | '));await browser.close();}
console.log(ok?'doom-finale OK':'doom-finale FAILED');process.exit(ok?0:1);
