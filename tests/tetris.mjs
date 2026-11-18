// Tetris 1P (R62): the 1P Arcade menu offers CLASSIC (start level 1/5/10/15) or VS CPU. Classic = one board, a level
// every 10 lines, faster each level, until you top out; then the solo result card. VS CPU still starts Block Battle.
// Usage: node tests/tetris.mjs   (SHAMB_URL=http://localhost:8123/ for a --pwa build; screens → local-test-reports/screenshots/tetris-*.png)
import {open, screenshotPath} from './lib.mjs';
let bad=0;const fail=m=>{bad++;console.log('FAIL',m);};
const sizes=[{width:390,height:780},{width:844,height:390},{width:1100,height:700}];
const start=async page=>{
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.action='arcade-solo';b.dataset.id='block-battle';document.body.append(b);b.click();b.remove();});
 await page.waitForTimeout(400);await page.click('#dialog button.primary');
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.menu,null,{timeout:8000});await page.waitForTimeout(300);};
const tapCanvas=async(page,px,py)=>{const r=await page.evaluate(()=>{const c=window.ShambConkins.store.session.c.getBoundingClientRect();return {x:c.left,y:c.top};});await page.mouse.click(r.x+px,r.y+py);};
const ready=async page=>{for(let i=0;i<20;i++){await page.waitForTimeout(250);if(await page.evaluate(()=>{const b=document.querySelector('.pass-overlay [data-ready]:not(:disabled)');b?.click();return !!b;}))return true;}return false;};
for(const vp of sizes){
 const tag=`${vp.width}x${vp.height}`,{browser,page,errors}=await open({viewport:vp});
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.action='arcade';document.body.append(b);b.click();b.remove();});await page.waitForTimeout(300);
 await page.click('[data-action=solo-set][data-key=on][data-value="1"]');await page.waitForTimeout(200);
 await start(page);
 await page.screenshot({path:screenshotPath(`tetris-menu-${tag}.png`)});
 // real taps: start level chip "10", then the CLASSIC card
 const L=await page.evaluate(()=>window.ShambConkins.store.session.debug.menu());
 const chip=L.chips.find(c=>c.lv===10);await tapCanvas(page,chip.x+chip.w/2,chip.y+chip.h/2);await page.waitForTimeout(150);
 if(await page.evaluate(()=>window.ShambConkins.store.session.debug.startLevel())!==10)fail(tag+' level chip did not pick 10');
 await tapCanvas(page,L.a.x+L.a.w/2,L.a.y+L.a.h*.25);
 if(!await ready(page))fail(tag+' no start card');
 await page.waitForTimeout(500);
 const c0=await page.evaluate(()=>{const s=window.ShambConkins.store.session;return {kind:s.solo.kind,cls:s.debug.classic&&{start:s.debug.classic.start,level:s.debug.classic.level(),fall:s.debug.classic.fall()}};});
 console.log(tag,'classic',JSON.stringify(c0));
 if(c0.kind!=='levels'||!c0.cls||c0.cls.start!==10||c0.cls.level!==10)fail(tag+' classic did not start at level 10');
 // speed-up: 10 more lines = level 11, falls faster
 const f2=await page.evaluate(()=>{const s=window.ShambConkins.store.session;s.debug.state[0].lines=10;return {level:s.debug.classic.level(),fall:s.debug.classic.fall()};});
 if(f2.level!==11||!(f2.fall<c0.cls.fall))fail(tag+' no speed-up at 10 lines '+JSON.stringify(f2));
 // clear a line for real: fill the bottom row except where an I piece goes flat
 await page.evaluate(()=>{const st=window.ShambConkins.store.session.debug.state[0];st.grid[19]=st.grid[19].map((v,x)=>x>=3&&x<=6?0:'G');st.piece={type:'I',cells:[[-1,0],[0,0],[1,0],[2,0]],x:4,y:0};});
 await page.keyboard.down(' ');await page.waitForTimeout(80);await page.keyboard.up(' ');await page.waitForTimeout(200);
 const cl=await page.evaluate(()=>{const st=window.ShambConkins.store.session.debug.state[0];return {lines:st.lines,score:st.score,row:st.grid[19].filter(Boolean).length};});
 if(cl.lines!==11||cl.row!==0)fail(tag+' line did not clear '+JSON.stringify(cl));
 await page.waitForTimeout(250);await page.screenshot({path:screenshotPath(`tetris-classic-${tag}.png`)});
 // hard-drop everything until the well tops out → solo result
 for(let i=0;i<80;i++){await page.keyboard.down(' ');await page.waitForTimeout(50);await page.keyboard.up(' ');await page.waitForTimeout(40);if(await page.evaluate(()=>document.getElementById('dialog').open))break;}
 await page.waitForTimeout(800);
 const res=await page.evaluate(()=>({dialog:document.getElementById('dialog').open,text:document.getElementById('dialog').innerText.replace(/\s+/g,' ').slice(0,200)}));
 console.log(tag,'result',JSON.stringify(res));if(!res.dialog||!/Tetris Classic/.test(res.text))fail(tag+' no Tetris Classic result');
 await page.screenshot({path:screenshotPath(`tetris-result-${tag}.png`)});
 // VS CPU still plays Block Battle
 await page.evaluate(()=>{const d=document.getElementById('dialog');[...d.querySelectorAll('button')].find(b=>/Back to the arcade|Continue|Exit|OK/.test(b.textContent))?.click();});
 for(let i=0;i<10;i++){await page.waitForTimeout(300);if(await page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){d.querySelector('button')?.click();return false;}return window.ShambConkins.store.view==='arcade';}))break;}
 await start(page);await page.evaluate(()=>window.ShambConkins.store.session.debug.pickMode('cpu'));
 if(!await ready(page))fail(tag+' vs CPU: no start card');await page.waitForTimeout(1500);
 const v=await page.evaluate(()=>{const s=window.ShambConkins.store.session;return {kind:s.solo.kind,classic:s.debug.classic,cpuIdx:s.debug.state[1].index};});
 console.log(tag,'vs cpu',JSON.stringify(v));if(v.kind!=='cpu'||v.classic||v.cpuIdx<1)fail(tag+' vs CPU not Block Battle');
 await page.screenshot({path:screenshotPath(`tetris-cpu-${tag}.png`)});
 const real=errors.filter(e=>!/CORS policy/.test(e));if(real.length){fail(tag+' errors '+real.join(' | '));}
 await browser.close();
}
console.log(bad?'FAIL':'OK');process.exit(bad?1:0);
