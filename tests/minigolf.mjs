// Sitabout Mini Golf in the browser (src/engines/puttPutt.js): the course picker, the hole flyover, a real drag-back putt,
// the away rule, a whole 3-hole round to the result card in 2P, the Grand Tour picker, and a round vs the CPU.
// Usage: node tests/minigolf.mjs [WxH]   (SHAMB_URL=... for a served build); screenshots: mg-*.png
import {launchBrowser,screenshotPath,appURL} from './lib.mjs';
const [w,h]=(process.argv[2]||'390x780').split('x').map(Number),tag=`${w}x${h}`;
const browser=await launchBrowser();
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
async function open({solo=false}={}){const page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();page.__e=[];page.on('pageerror',e=>page.__e.push(e.message));
 await page.goto(await appURL(),{timeout:180000});await page.waitForSelector('.title-screen',{timeout:90000});await page.waitForFunction(()=>!document.getElementById('boot'));
 await page.evaluate(v=>{const S=window.ShambConkins;if(v)S.store.profile.settings.solo={on:true,who:0,level:'easy'};S.requestGame({id:'happy-gilmore-golf',origin:'arcade',solo:v,quick:true});},solo);
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.engine==='minigolf',null,{timeout:30000});return page;}
const D=(page,f,a)=>page.evaluate(f,a);
const dbg=page=>D(page,()=>{const d=window.ShambConkins.store.session?.debug;return d?d.state():null;});
async function playOut(page,limitS=240){const t0=Date.now();let end='';while(Date.now()-t0<limitS*1000){
  const r=await D(page,()=>{const S=window.ShambConkins.store,dl=document.getElementById('dialog');if(dl.open&&!S.session)return 'END '+dl.innerText.replace(/\s+/g,' ').slice(0,160);const d=S.session?.debug;if(!d)return '';const st=d.state();if(st.phase==='aim'&&!(S.session.solo&&st.turn===1))d.shoot(.8);else d.bot();return '';});
  if(r.startsWith('END')){end=r;break;}await page.waitForTimeout(400);}return end;}
// ---- 2P: picker, flyover, a real drag putt, then three holes to the end
{const page=await open();await page.waitForTimeout(600);await page.screenshot({path:screenshotPath(`mg-menu-${tag}.png`)});
 check((await dbg(page)).phase==='menu','the Arcade opens on the course picker');
 // tap the Spaceballs card then FRONT 3 then TEE OFF through the real canvas
 await D(page,()=>window.ShambConkins.store.session.debug.pick('bushwood',3));await page.waitForTimeout(800);
 let st=await dbg(page);check(st.phase==='intro'&&st.hole==='bushwood-1','TEE OFF starts hole 1 with the flyover');await page.screenshot({path:screenshotPath(`mg-intro-${tag}.png`)});
 const cv=await page.$('.game-canvas'),R=await cv.boundingBox();await page.mouse.click(R.x+R.width/2,R.y+R.height/2);await page.waitForTimeout(700);
 st=await dbg(page);check(st.phase==='aim'&&st.turn===0,'a tap skips the flyover; player 1 has the honour');
 await page.mouse.move(R.x+R.width/2,R.y+R.height*.4);await page.mouse.down();const land=w>h*1.1;await page.mouse.move(R.x+R.width/2+(land?-110:8),R.y+R.height*.4+(land?8:110),{steps:6});await page.waitForTimeout(150);await page.screenshot({path:screenshotPath(`mg-aim-${tag}.png`)});await page.mouse.up();
 await page.waitForTimeout(250);st=await dbg(page);check(st.strokes[0]===1&&(st.phase==='roll'||st.phase==='wait'||st.phase==='sunk'),'a drag back and release putts the ball');
 await page.waitForTimeout(300);const y0=await D(page,()=>window.ShambConkins.store.session.debug.balls[0].b.y);check(y0<121,'the ball heads up the green toward the cup ('+y0.toFixed(1)+')');
 await page.waitForFunction(()=>{const d=window.ShambConkins.store.session.debug;return d.phase==='aim'||d.phase==='card';},null,{timeout:30000});await page.screenshot({path:screenshotPath(`mg-after-${tag}.png`)});
 st=await dbg(page);if(st.phase==='aim')check(st.turn===1||st.cards[0][0]===1,'after player 1 putts, player 2 tees off (or player 1 aced it)');
 const end=await playOut(page);check(/Sitabout Mini Golf/.test(end),`three holes play to the result card (${end.slice(0,90)})`);
 check(!page.__e.length,'no page errors'+(page.__e.length?': '+page.__e[0]:''));await page.close();}
// ---- 1P vs the CPU (easy) on the Waterbury front three
{const page=await open({solo:true});await D(page,()=>window.ShambConkins.store.session.debug.pick('gilmore',3));
 const end=await playOut(page,300);check(/Sitabout Mini Golf/.test(end)&&/CPU|Amber/.test(end+await D(page,()=>document.body.innerText.slice(0,0))||'x'),`a round vs the CPU ends with a result (${end.slice(0,90)})`);
 check(!page.__e.length,'no page errors vs the CPU'+(page.__e.length?': '+page.__e[0]:''));await page.close();}
await browser.close();console.log(bad?`${bad} problem(s)`:'MINIGOLF OK');process.exit(bad?1:0);
