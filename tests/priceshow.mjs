// The Price Is Right episode (engines/priceShow.js, id price-bid-off): one whole 2-player episode to the result card, plus real taps
// on the number pad and a real swipe on the wheel. Usage: node tests/priceshow.mjs [WxH] [cpu]   (SHAMB_URL=...); screenshots: pi-*.png
import {launchBrowser,screenshotPath} from './lib.mjs';
const [w,h]=(process.argv[2]||'390x780').split('x').map(Number),tag=`${w}x${h}`,vsCpu=process.argv[3]==='cpu';
const browser=await launchBrowser(),page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/engine failure/i.test(m.text()))errors.push(m.text());});page.on('console',async m=>{if(/engine failure/i.test(m.text())){const a=await Promise.all(m.args().map(x=>x.evaluate(v=>v?.stack||String(v)).catch(()=>'')));console.log(a.join(' ').slice(0,600));}});
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
await page.goto(process.env.SHAMB_URL||'http://localhost:8123/',{timeout:180000});await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
await page.evaluate(v=>{const S=window.ShambConkins;if(v)S.store.profile.settings.solo={on:true,who:0,level:'normal'};S.requestGame({id:'price-bid-off',origin:'arcade',solo:v,quick:true});},vsCpu);
const seen=new Set(),shots=new Set(),t0=Date.now();let padTapped=false,swiped=false,end='';
const shot=async k=>{if(!shots.has(k)){shots.add(k);await page.screenshot({path:screenshotPath(`pi-${k}-${tag}.png`)});}};
while(Date.now()-t0<420000){
 const st=await page.evaluate(()=>{const S=window.ShambConkins.store,d=document.getElementById('dialog');if(d.open&&!S.session)return {done:d.innerText.replace(/\s+/g,' ').slice(0,160)};if(!S.session)return {};const ready=document.querySelector('.pass-overlay [data-ready]');if(ready){ready.click();return {ready:true};}return {pad:!!document.querySelector('.pi-keys'),again:!!document.querySelector('[data-again]'),h2:document.querySelector('.pi-center h2')?.textContent||'',scene:S.session.debug?.scene};});
 if(st.done){end=st.done;break;}
 if(st.h2)seen.add(st.h2);
 if(st.pad){await shot('bid');if(!padTapped){padTapped=true;const before=await page.locator('[data-led]').textContent();await page.click('.pi-k[data-d="4"]');await page.click('.pi-k[data-d="2"]');const after=await page.locator('[data-led]').textContent();check(before==='$0'&&after==='$42','the number pad types a bid');await page.click('.pi-k.go');}else await page.evaluate(()=>window.ShambConkins.store.session.debug.bot());}
 else if([...seen].includes('THE BIG WHEEL')&&!swiped&&st.scene&&!st.h2&&!st.again){await page.waitForTimeout(300);await shot('wheel');swiped=true;await page.mouse.move(w*.5,h*.35);await page.mouse.down();await page.mouse.move(w*.5,h*.7,{steps:4});await page.mouse.up();await page.waitForTimeout(700);await shot('wheel-spin');}
 else{if(st.scene&&!st.h2){if([...seen].includes('CLIFF HANGERS'))await shot('cliff');else if([...seen].includes('PLINKO'))await shot('plinko');}await page.evaluate(()=>window.ShambConkins.store.session?.debug?.bot?.());}
 await page.waitForTimeout(220);
}
check(['PLINKO','CLIFF HANGERS','THE BIG WHEEL'].every(k=>seen.has(k)),'the episode reaches all three pricing games: '+[...seen].slice(0,8).join(' | '));
check(swiped,'the wheel was spun with a swipe');
check(/\$/.test(end),'the episode ends on the result card: '+end);
check(!errors.length,'no page errors '+errors.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'PRICE SHOW OK');process.exit(bad?1:0);
