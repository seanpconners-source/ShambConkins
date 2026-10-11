// Plays to the first fork and exercises the docked route chooser.
import {open} from './lib.mjs';
const size = process.argv[2] || '1100x700'; const [w, h] = size.split('x').map(Number);
const {browser, page, errors} = await open({viewport: {width: w, height: h}});
await page.click('text=NEW GAME'); await page.click('[data-action=start-run]');
let found = false;
for (let i = 0; i < 400 && !found; i++) {
  found = await page.evaluate(() => document.body.classList.contains('route-choosing'));
  if (found) break;
  await page.evaluate(() => {
    const d = document.getElementById('dialog');
    if (d.open) { const b = d.querySelector('button:not([disabled])'); b?.click(); return; }
    const r = document.querySelector('[data-action=roll]'); if (r && !r.disabled) r.click();
  });
  await page.waitForTimeout(150);
}
console.log('fork reached:', found);
if (!found) {
  const debug=await page.evaluate(() => {
    const d=document.getElementById('dialog'),r=document.querySelector('[data-action=roll]');
    let state=null;try{state=window.ShambConkins?.diagnostics?.();}catch(e){state={error:String(e)};}
    return {
      currentView:document.body.className,
      dialogs:d?{open:d.open,text:d.innerText.slice(0,400),buttons:[...d.querySelectorAll('button')].map(x=>({text:x.innerText,disabled:x.disabled,action:x.dataset.action}))}:null,
      roll:r?{text:r.innerText,disabled:r.disabled,outer:r.outerHTML.slice(0,400)}:null,
      state,buttons:[...document.querySelectorAll('button')].filter(x=>x.offsetParent).slice(0,20).map(x=>({text:x.innerText.slice(0,50),disabled:x.disabled,action:x.dataset.action})),
      screen:document.body.innerText.slice(0,1200)
    };
  });
  console.log('ROUTE_DIAGNOSTIC',JSON.stringify(debug));
  await page.screenshot({path:'/tmp/claude-0/route-timeout.png'});
}
if (found) {
  await page.waitForTimeout(800);
  await page.screenshot({path: '/tmp/claude-0/route1.png'});
  const info = await page.evaluate(() => ({options: [...document.querySelectorAll('.rp-option')].map(b => b.innerText.replace(/\n/g, ' | ').slice(0, 140)), glow: document.querySelectorAll('#map-root .glow').length, dim: document.querySelectorAll('#map-root .dim').length}));
  console.log(info);
  await page.click('.rp-option:not([disabled])'); await page.waitForTimeout(500);
  await page.screenshot({path: '/tmp/claude-0/route2.png'});
  console.log('glow after preview:', await page.evaluate(() => document.querySelectorAll('#map-root .glow').length));
  await page.click('[data-action=route-go]'); await page.waitForTimeout(2500);
  console.log('panel closed:', await page.evaluate(() => !document.body.classList.contains('route-choosing')));
  console.log('chips:', await page.evaluate(() => [...document.querySelectorAll('.status-chip')].map(c => c.innerText)));
}
console.log('errors', errors);
await browser.close();
