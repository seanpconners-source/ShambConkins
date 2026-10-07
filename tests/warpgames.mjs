// Warp-zone minigames: launches each (or those matching argv[2]) at phone and desktop size, plays with random
// keys and touches, takes screenshots and fails on any JS error. SECS per game (default 8).
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc',secs=+(process.env.SECS||8),re=new RegExp(process.argv[2]||'.');let ok=true;
const {browser:b0,page:p0}=await open();const ids=(await p0.evaluate(()=>window.ShambConkins.gameRegistry.filter(g=>g.warpOnly).map(g=>g.id))).filter(id=>re.test(id));await b0.close();
console.log(ids.length,'warp games');
for(const id of ids)for(const [w,h] of [[390,780],[1100,700]]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`${id}-${w}`;
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);await page.waitForTimeout(400);
 await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 await page.waitForTimeout(1600);await page.screenshot({path:`${out}/${tag}-a.png`});
 const keys=['d','ArrowRight','w','ArrowUp','a','ArrowLeft','Space','Enter','s','ArrowDown'];const end=Date.now()+secs*1000;let shot=false;
 while(Date.now()<end){
  await page.evaluate(()=>{const o=document.querySelector('.pass-overlay [data-ready]');if(o)o.click();const d=document.getElementById('dialog');if(d.open){const b=[...d.querySelectorAll('button')].find(b=>!/exit|back|return|end/i.test(b.textContent));b?.click();}}).catch(()=>{});
  const c=await page.$('#game-layer canvas');if(c){const bb=await c.boundingBox();if(bb){const x=bb.x+Math.random()*bb.width,y=bb.y+Math.random()*bb.height;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+(Math.random()-.5)*120,y+(Math.random()-.5)*80,{steps:3});await page.mouse.up();}}
  const k=keys[Math.floor(Math.random()*keys.length)];await page.keyboard.down(k);await page.waitForTimeout(120+Math.random()*200);await page.keyboard.up(k);
  if(!shot&&Date.now()>end-secs*500){shot=true;await page.screenshot({path:`${out}/${tag}-b.png`});}
 }
 await page.screenshot({path:`${out}/${tag}-c.png`});
 const st=await page.evaluate(()=>({game:window.ShambConkins.diagnostics?.().game,score:[...document.querySelectorAll('.game-scoreplayer b')].map(b=>b.textContent)})).catch(e=>({err:e.message}));
 console.log(tag,JSON.stringify(st),errors.length?'ERRORS '+errors.join(' | '):'clean');if(errors.length)ok=false;await browser.close();}
console.log(ok?'warp games OK':'warp games FAILED');process.exit(ok?0:1);
