// Solo (1P) Arcade mode: the 1P / 2P switch, solo cards, and solo runs of the given games.
// Usage: node tests/solo.mjs [id-regex] [WxH]   (screens → local-test-reports/screenshots/solo-*.png)
import {open, screenshotPath} from './lib.mjs';
const only=new RegExp(process.argv[2]||'^$'),[vw,vh]=(process.argv[3]||'390x780').split('x').map(Number);
const {browser,page,errors}=await open({viewport:{width:vw,height:vh}});
const act=v=>page.evaluate(v=>{const b=document.createElement('button');b.dataset.action=v;document.body.append(b);b.click();b.remove();},v);
const S=f=>page.evaluate(f);
let bad=0;const fail=m=>{console.log('FAIL:',m);bad++;};
await S(()=>{window.ShambConkins.store.profile.settings.devMode=true;});
await act('arcade');await page.waitForTimeout(300);
if(!await page.$('.solo-strip'))fail('no 1P/2P switch');
await page.click('[data-action=solo-set][data-key=on][data-value="1"]');await page.waitForTimeout(200);
const ui=await S(()=>({on:window.ShambConkins.store.profile.settings.solo?.on,solo:document.querySelectorAll('[data-action=arcade-solo]').length,off:document.querySelectorAll('.arcade-card.solo-off').length,first:document.querySelector('.catalog-grid>article h3')?.textContent}));
console.log('1P arcade',JSON.stringify(ui));if(!ui.on||!ui.solo)fail('no solo cards in 1P');
await page.click('[data-action=solo-set][data-key=who][data-value="1"]');await page.click('[data-action=solo-set][data-key=level][data-value=hard]');await page.waitForTimeout(200);
const set=await S(()=>window.ShambConkins.store.profile.settings.solo);console.log('settings',JSON.stringify(set));if(set.who!==1||set.level!=='hard')fail('switch did not save');
await page.screenshot({path:screenshotPath(`solo-arcade-${vw}x${vh}.png`)});
await page.click('[data-action=solo-set][data-key=who][data-value="0"]');await page.click('[data-action=solo-set][data-key=level][data-value=normal]');
// Solo runs: start each matching game from its card, let its debug bot / timeouts play, then bank via Exit.
const ids=await S(()=>Array.from(window.ShambConkins.gameRegistry).map(g=>g.id));
for(const id of ids.filter(id=>only.test(id))){
 await S(()=>{document.getElementById('catalog-search').value='';});
 await page.evaluate(id=>{const b=document.createElement('button');b.dataset.action='arcade-solo';b.dataset.id=id;document.body.append(b);b.click();b.remove();},id);
 await page.waitForTimeout(400);await page.click('#dialog button.primary');
 const t0=Date.now();let shots=0,state;
 for(let i=0;i<Number(process.env.STEPS||40);i++){
  await page.waitForTimeout(500);
  state=await S(()=>{const s=window.ShambConkins.store.session;return {alive:!!s?.alive,pass:!!document.querySelector('.pass-overlay [data-ready]:not(:disabled)'),overline:document.querySelector('.pass-overlay .overline')?.textContent,prog:s?.soloProgress,score:s?.score,dialog:document.getElementById('dialog').open,title:document.querySelector('#dialog h2,#dialog .dialog-title')?.textContent};});
  if(state.pass){if(state.overline&&!/SOLO|CPU/.test(state.overline))fail(`${id}: pass card says ${state.overline}`);await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]:not(:disabled)')?.click());}
  if(process.env.HOOK)await page.evaluate(new Function('id',process.env.HOOK),id);
  if(i===6&&shots++<1)await page.screenshot({path:screenshotPath(`solo-${id}-${vw}x${vh}.png`)});
  if(!state.alive)break;
 }
 if(state.alive){await act('exit-game');await page.waitForTimeout(300);await page.evaluate(()=>{const d=document.getElementById('dialog');const b=[...d.querySelectorAll('button')].find(b=>/Bank|End/.test(b.textContent));b?.click();});await page.waitForTimeout(600);}
 const res=await S(()=>({dialog:document.getElementById('dialog').open,text:document.getElementById('dialog').innerText.slice(0,240),best:window.ShambConkins.store.profile.soloBest}));
 console.log(id,`${((Date.now()-t0)/1000).toFixed(0)}s`,'progress',JSON.stringify(state.prog),'→',JSON.stringify(res.text.replace(/\s+/g,' ')));
 await page.screenshot({path:screenshotPath(`solo-${id}-result-${vw}x${vh}.png`)});
 await page.evaluate(()=>{const d=document.getElementById('dialog');[...d.querySelectorAll('button')].find(b=>/Back to the arcade|Continue|Exit|OK/.test(b.textContent))?.click();});
 for(let i=0;i<10;i++){await page.waitForTimeout(300);const v=await S(()=>({view:window.ShambConkins.store.view,dialog:document.getElementById('dialog').open,busy:window.ShambConkins.store.busy}));if(v.dialog)await page.evaluate(()=>document.querySelector('#dialog button')?.click());else if(v.view==='arcade'&&!v.busy)break;}
}
const real=errors.filter(e=>!/CORS policy/.test(e)); // offline Wikipedia portraits
console.log('errors',real);if(real.length)bad++;
await browser.close();console.log(bad?'FAIL':'OK');process.exit(bad?1:0);
