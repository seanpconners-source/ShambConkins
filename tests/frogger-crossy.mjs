// Frogger and Crossy Road (engines/froggerCrossy.js): real swipes hop the frog; a frog on the road gets squashed and in the river drowns
// off a log; a bay fills and pays; Crossy hops forward, trees block, water kills, the eagle takes a lazy player; both end on the result
// card. Usage: node tests/frogger-crossy.mjs [WxH]   (SHAMB_URL=...); screenshots: fc-*.png
import {launchBrowser,screenshotPath} from './lib.mjs';
const [w,h]=(process.argv[2]||'390x780').split('x').map(Number),tag=`${w}x${h}`;
const browser=await launchBrowser();
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
async function open(id){const page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();page.__errors=[];page.on('pageerror',e=>page.__errors.push(e.message));
 await page.goto(process.env.SHAMB_URL||'http://localhost:8123/',{timeout:180000});await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade',quick:true});},id);await page.waitForSelector('.pass-overlay [data-ready]',{timeout:20000});await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]').click());
 await page.waitForFunction(()=>{const s=window.ShambConkins.store.session;return s?.debug?.world&&!document.querySelector('.pass-overlay');},null,{timeout:20000});await page.waitForTimeout(400);return page;}
const swipeUp=async page=>{await page.mouse.move(w/2,h*.7);await page.mouse.down();await page.mouse.move(w/2,h*.6,{steps:3});await page.mouse.up();await page.waitForTimeout(260);};
const W=(page,fn,arg)=>page.evaluate(fn,arg);
async function finish(page,label){for(const kill of [0,1]){const r=await W(page,()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return false;const w=d.world;if(d.engine==='frogger'){w.lives=1;d.die(w,'car');}else d.kill(w,'car');return true;});if(!r)break;await page.waitForTimeout(3200);await W(page,()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(4200);}
 const ended=await page.waitForFunction(()=>document.getElementById('dialog').open,null,{timeout:30000}).then(()=>true,()=>false);check(ended,label+' ends on the result card');check(!page.__errors.length,label+': no page errors '+page.__errors.slice(0,2).join(' | '));}

// ---- Frogger
{const page=await open('frogger-heads');await page.screenshot({path:screenshotPath(`fc-frogger-${tag}.png`)});
 const r0=await W(page,()=>window.ShambConkins.store.session.debug.world.row);await swipeUp(page);check((await W(page,()=>window.ShambConkins.store.session.debug.world.row))===r0+1,'a swipe up hops the frog one row');
 const onRoad=await W(page,async()=>{const d=window.ShambConkins.store.session.debug,w=d.world;w.row=1;w.fromRow=1;w.hopT=0;for(let k=0;k<600;k++){await new Promise(r=>setTimeout(r,20));if(w.dead>0)return w.why;}return null;});check(onRoad==='car','standing on the road gets the frog squashed ('+onRoad+')');
 await page.waitForTimeout(1300);
 const water=await W(page,async()=>{const d=window.ShambConkins.store.session.debug,w=d.world;const objs=d.LANES;w.row=9;w.fromRow=9;w.x=-.4;w.hopT=0;for(let k=0;k<400;k++){await new Promise(r=>setTimeout(r,20));if(w.dead>0)return w.why;}return null;});check(water==='water','missing a log in the river drowns the frog ('+water+')');await page.waitForTimeout(1300);
 const bay=await W(page,async()=>{const d=window.ShambConkins.store.session.debug,w=d.world,before=w.score;w.lives=3;w.dead=0;w.row=12;w.fromRow=12;w.x=6;w.hopT=0;await new Promise(r=>setTimeout(r,150));return {filled:w.homes.filter(Boolean).length,gain:w.score-before,row:w.row};});check(bay.filled===1&&bay.gain>=50&&bay.row===0,'reaching a bay fills it, pays and sends a new frog: '+JSON.stringify(bay));await page.screenshot({path:screenshotPath(`fc-frogger-bay-${tag}.png`)});
 await finish(page,'Frogger');}
// ---- Crossy Road
{const page=await open('crossy-chaos');await page.waitForTimeout(600);await page.screenshot({path:screenshotPath(`fc-crossy-${tag}.png`)});
 const r0=await W(page,()=>window.ShambConkins.store.session.debug.world.row);await page.mouse.click(w/2,h*.7);await page.waitForTimeout(350);check((await W(page,()=>window.ShambConkins.store.session.debug.world.row))===r0+1,'a tap hops forward');
 const tree=await W(page,async()=>{const d=window.ShambConkins.store.session.debug,w=d.world,r=d.rows;let row=r.findIndex((x,i)=>i>2&&x.kind==='grass'&&x.trees?.some(c=>Math.abs(c)<=4));const col=r[row].trees.find(c=>Math.abs(c)<=4);w.row=row-1;w.fromRow=row-1;w.x=col;w.fromX=col;w.best=row-1;w.cam=row-4;w.hopT=0;d.hop(0,-1);await new Promise(r=>setTimeout(r,250));return {stayed:w.row===row-1};});check(tree.stayed,'a tree blocks the hop');
 await page.screenshot({path:screenshotPath(`fc-crossy-trees-${tag}.png`)});
 const river=await W(page,async()=>{const d=window.ShambConkins.store.session.debug,w=d.world,r=d.rows,row=r.findIndex(x=>x.kind==='river');const objs=d.rowObjects(r[row],w.t);let x=null;for(let c=-4;c<=4;c++)if(!d.rowObjects(r[row],w.t+.3).some(o=>c>o.x0-1&&c<o.x1+1)){x=c;break;}w.row=row;w.fromRow=row;w.x=x??-4;w.fromX=x??-4;w.best=row;w.cam=row-4;w.hopT=0;for(let k=0;k<150;k++){await new Promise(r=>setTimeout(r,20));if(w.dead)return w.dead;}return null;});check(river==='water','stepping into the river splashes ('+river+')');await page.waitForTimeout(600);await page.screenshot({path:screenshotPath(`fc-crossy-dead-${tag}.png`)});
 await page.waitForTimeout(2400);await W(page,()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(4400);
 const eagle=await W(page,async()=>{const w=window.ShambConkins.store.session?.debug?.world;if(!w)return 'no world';for(let k=0;k<700;k++){await new Promise(r=>setTimeout(r,20));if(w.dead)return w.dead;}return null;});check(eagle==='eagle','standing still brings the eagle ('+eagle+')');await page.screenshot({path:screenshotPath(`fc-crossy-eagle-${tag}.png`)}).catch(()=>{});
 const ended=await page.waitForFunction(()=>document.getElementById('dialog').open,null,{timeout:30000}).then(()=>true,()=>false);check(ended,'Crossy Road ends on the result card');check(!page.__errors.length,'Crossy Road: no page errors '+page.__errors.slice(0,2).join(' | '));}
await browser.close();console.log(bad?`${bad} problem(s)`:'FROGGER + CROSSY OK');process.exit(bad?1:0);
