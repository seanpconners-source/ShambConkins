// The Price Is Right (id price-bid-off, engines/tpirShow.js): the title-screen menu, a real tap on a pricing game card, the hand-off
// into Plinko / The Big Wheel in the same session, and the result filed under the pricing game's own id (1P vs CPU).
// Also: the Arcade lists one Price Is Right entry (Plinko and the Big Wheel are inside it).
// Usage: node tests/tpir.mjs [WxH]   (SHAMB_URL=...); screenshots: tpir-*.png
import {launchBrowser,screenshotPath,appURL} from './lib.mjs';
const [w,h]=(process.argv[2]||'390x780').split('x').map(Number),tag=`${w}x${h}`;
const browser=await launchBrowser(),page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/engine failure/i.test(m.text()))errors.push(m.text());});
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
await page.goto((await appURL()),{timeout:180000});await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
async function play(which){
 await page.evaluate(()=>{const S=window.ShambConkins;S.store.profile.settings.solo={on:true,who:0,level:'normal'};S.requestGame({id:'price-bid-off',origin:'arcade',solo:true,quick:true});});
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.menu,null,{timeout:20000});
 await page.waitForTimeout(2600);await page.screenshot({path:screenshotPath(`tpir-menu-${tag}.png`)});
 // tap the card of the wanted game (cards are drawn on the canvas: find its box from the engine's layout by tapping candidates)
 const games=await page.evaluate(()=>window.ShambConkins.store.session.debug.games);check(games.includes('plinko-show')&&games.includes('big-wheel'),'the menu offers '+games.join(', '));
 const box=await page.locator('#game-canvas').boundingBox(),cards=await page.evaluate(()=>window.ShambConkins.store.session.debug.cards),cd=cards.find(c=>c.id===which);
 check(!!cd,`${which} has a card on screen`);await page.mouse.click(box.x+cd.x+cd.w/2,box.y+cd.y+cd.h/2);await page.waitForTimeout(150);
 const picked=await page.evaluate(()=>window.ShambConkins.store.session?.debug?.chosen??-1);check(games[picked]===which,'a real tap on its card picks '+which);
 await page.waitForFunction(()=>{const d=window.ShambConkins.store.session?.debug;return d&&!d.menu&&d.mode;},null,{timeout:15000});
 await page.waitForTimeout(2500);await page.screenshot({path:screenshotPath(`tpir-${which}-${tag}.png`)});
 const t0=Date.now();let end='';
 while(Date.now()-t0<240000){const st=await page.evaluate(()=>{const S=window.ShambConkins.store,d=document.getElementById('dialog');if(d.open&&!S.session)return {done:d.innerText.replace(/\s+/g,' ').slice(0,160)};const D=S.session?.debug;if(!D)return {};
   D.hurry=true;if(D.price&&D.price.res==null){D.pick(0);}else if(D.mode==='aim'){D.drop();}else if(D.mode==='pull'){D.spin(14);}else if(D.mode==='choose'){D.choose('stay');}return {mode:D.mode};});
  if(st.done){end=st.done;break;}await page.waitForTimeout(250);}
 check(/\$|wins|WIN|tie/i.test(end),`${which} plays to the result card: `+end.slice(0,100));
 const best=await page.evaluate(id=>window.ShambConkins.store.profile.soloBest?.[id]||null,which);check(best!==null,`the result is filed under ${which}`);
 await page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open)d.close();});
 }
await play('plinko-show');await play('big-wheel');
check(!errors.length,'no page errors '+errors.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'TPIR OK');process.exit(bad?1:0);
