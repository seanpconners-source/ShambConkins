// Screenshots the home screen at phone, desktop and short-landscape sizes; reports overflow and page errors.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';
for(const vp of [{width:390,height:780},{width:360,height:640},{width:1100,height:700},{width:780,height:390}]){
const {browser,page,errors}=await open({viewport:vp});
await page.waitForTimeout(700);
const info=await page.evaluate(()=>{const c=document.querySelector('.home-center')||document.body;return {scroll:c.scrollHeight>c.clientHeight+1,docScrollX:document.documentElement.scrollWidth>innerWidth};});
await page.screenshot({path:`${out}/home-${vp.width}x${vp.height}.png`});
console.log(vp.width+'x'+vp.height,JSON.stringify(info),'errors',errors);
await browser.close();}
