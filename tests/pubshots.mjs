// Screenshots of Paddy's Beer Pong and Flipadelphia (aim, mid-flight, result) at phone and desktop size.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;
for(const [w,h] of [[390,780],[1100,700]])for(const id of ['paddys-beer-pong','flipadelphia-cup']){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 await page.waitForTimeout(500);
 const go=async()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){const b=[...d.querySelectorAll('button')].find(b=>/start|ready|play|go/i.test(b.textContent))||d.querySelector('button.primary,button');b?.click();return true;}const p=[...document.querySelectorAll('button')].find(b=>/ready|start/i.test(b.textContent)&&b.offsetParent);if(p){p.click();return true;}return false;});
 for(let i=0;i<8;i++){await go();await page.waitForTimeout(500);}
 await page.waitForTimeout(3500);
 const tag=`${id}-${w}`;
 await page.screenshot({path:`${out}/${tag}-aim.png`});
 const box=await page.evaluate(()=>{const c=document.querySelector('.game-canvas').getBoundingClientRect();return {x:c.x,y:c.y,w:c.width,h:c.height};});
 const cx=box.x+box.w/2,cy=box.y+box.h*.85;
 await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+4,cy-box.h*.15,{steps:4});await page.screenshot({path:`${out}/${tag}-drag.png`});await page.mouse.move(cx+6,cy-box.h*.3,{steps:4});await page.mouse.up();
 await page.waitForTimeout(350);await page.screenshot({path:`${out}/${tag}-flight.png`});
 await page.waitForTimeout(900);await page.screenshot({path:`${out}/${tag}-result.png`});
 console.log(tag,'errors',errors);ok=ok&&!errors.length;await browser.close();}
process.exit(ok?0:1);
