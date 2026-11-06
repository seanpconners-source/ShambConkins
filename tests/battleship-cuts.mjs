// Battleship cut scenes (engines/battleshipCuts.js): a hit plays the deck gun, a sunk ship plays Abandon Ship, a tap skips, and the
// game carries on with the same player firing. Usage: node tests/battleship-cuts.mjs [WxH]   screenshots: bs-cut-*.png
import {launchBrowser,screenshotPath,appURL} from './lib.mjs';
const [w,h]=(process.argv[2]||'390x780').split('x').map(Number),tag=`${w}x${h}`;
const browser=await launchBrowser(),page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
await page.goto((await appURL()),{timeout:180000});await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
await page.evaluate(()=>{window.ShambConkins.requestGame({id:'battleship-fog',origin:'arcade',quick:true});});
const D=fn=>page.evaluate(fn);
const tapThrough=async until=>{for(let k=0;k<80;k++){if(await D(until))return true;await D(()=>{document.querySelector('.pass-overlay [data-ready]')?.click();const b=[...document.querySelectorAll('.pk-btn')].find(b=>/Man the decks|Ready/.test(b.textContent));b?.click();});await page.waitForTimeout(250);}return false;};
check(await tapThrough(()=>window.ShambConkins.store.session?.debug?.fire&&window.ShambConkins.store.session.debug.P===0&&window.ShambConkins.store.session.debug.fleets[1]),'both fleets placed, player 1 is firing');
// the smallest enemy ship, cell by cell
const cells=await D(()=>{const sh=window.ShambConkins.store.session.debug.fleets[1].find(q=>q.len===2);return Array.from({length:sh.len},(_,i)=>[sh.x+(sh.dir?0:i),sh.y+(sh.dir?i:0)]);});
await page.evaluate(c=>window.ShambConkins.store.session.debug.fire(c[0],c[1]),cells[0]);
await page.waitForFunction(()=>document.querySelector('.bs-cut'),null,{timeout:8000});await page.waitForTimeout(1050);check(await page.evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight/2)?.classList.contains('bs-cut')),'the cut scene is on top of the game');await page.screenshot({path:screenshotPath(`bs-cut-hit-${tag}.png`)});check(true,'a hit plays the deck gun cut scene');
await page.waitForFunction(()=>!document.querySelector('.bs-cut'),null,{timeout:8000});check(true,'the cut scene ends by itself');
await page.waitForFunction(()=>!!document.querySelector('[data-act=fire]')&&window.ShambConkins.store.session.debug.P===0,null,{timeout:8000});await page.waitForTimeout(200);
await page.evaluate(c=>window.ShambConkins.store.session.debug.fire(c[0],c[1]),cells[1]);
await page.waitForFunction(()=>+document.querySelector('.bs-cut')?.dataset.t>=2.6,null,{timeout:40000});await page.screenshot({path:screenshotPath(`bs-cut-sunk-${tag}.png`)});
await page.mouse.click(w/2,h/2);await page.waitForTimeout(150);check(await D(()=>!document.querySelector('.bs-cut')),'a tap skips the cut scene');
check(await D(()=>window.ShambConkins.store.session.debug.sunk[0]===1),'the ship counts as sunk');
await page.waitForFunction(()=>!!document.querySelector('[data-act=fire]'),null,{timeout:8000}).then(()=>check(true,'player 1 fires again'),()=>check(false,'player 1 fires again'));
check(!errors.length,'no page errors '+errors.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'BATTLESHIP CUTS OK');process.exit(bad?1:0);
