// Screenshots the minigame vault and character roster (phone + desktop); scrolls to check endless loading.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';
for(const vp of [{width:390,height:780},{width:1100,height:700}]){
 const {browser,page,errors}=await open({viewport:vp});
 for(const view of ['arcade','roster']){
  await page.evaluate(v=>{const b=document.createElement('button');b.dataset.action=v;document.body.append(b);b.click();b.remove();},view);
  await page.waitForTimeout(500);
  await page.screenshot({path:`${out}/cat-${view}-${vp.width}.png`});
  const before=await page.evaluate(()=>document.querySelectorAll('.catalog-grid>article').length);
  for(let i=0;i<4;i++){await page.evaluate(()=>{const g=document.querySelector('.catalog-grid');g.scrollTop=g.scrollHeight;});await page.waitForTimeout(250);}
  const after=await page.evaluate(()=>({cards:document.querySelectorAll('.catalog-grid>article').length,search:document.getElementById('catalog-search')?.getBoundingClientRect().toJSON(),docX:document.documentElement.scrollWidth>innerWidth}));
  await page.screenshot({path:`${out}/cat-${view}-${vp.width}-scrolled.png`});
  console.log(vp.width,view,'cards',before,'→',after.cards,'search',JSON.stringify(after.search),'docScrollX',after.docX);
 }
 console.log('errors',errors);await browser.close();
}
