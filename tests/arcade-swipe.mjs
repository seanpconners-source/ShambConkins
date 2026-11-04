// M24: swiping sideways on the Arcade game page moves to the next / previous game (arcadeConsole.js). Real touch events
// (CDP, like a phone) and a mouse drag; a short or vertical move changes nothing; a swipe that starts on the Play button
// doesn't launch the game; the first game doesn't swipe further back; taps still work. SHAMB_URL for a --pwa build.
import {chromium,browserLaunchOptions,root,screenshotPath} from './lib.mjs';
import path from 'node:path';import {pathToFileURL} from 'node:url';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const url=process.env.SHAMB_URL||pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href;
const browser=await chromium.launch(browserLaunchOptions());
const ctx=await browser.newContext({viewport:{width:390,height:780},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForSelector('.title-screen',{timeout:120000});
await page.evaluate(()=>{const b=document.querySelector('[data-action="arcade"]');b.click();});await page.waitForSelector('.arcade-console .arc-tile');await page.waitForTimeout(900);
const cdp=await ctx.newCDPSession(page);
const focus=()=>page.evaluate(()=>[...document.querySelectorAll('.arcade-console .arc-tile')].findIndex(t=>t.classList.contains('on')));
const title=()=>page.evaluate(()=>document.querySelector('.arc-title')?.textContent?.trim());
async function touchDrag(x0,y0,x1,y1,steps=10,ms=14){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
 for(let k=1;k<=steps;k++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*k/steps,y:y0+(y1-y0)*k/steps}]});await page.waitForTimeout(ms);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(700);}
const n=await page.locator('.arcade-console .arc-tile').count();check(n>2,`Featured shelf has ${n} tiles`);
const f0=await focus(),t0=await title();
await touchDrag(330,330,60,340);const f1=await focus();check(f1===f0+1,`touch swipe left: next game (${f0} → ${f1}, ${t0} → ${await title()})`);
await page.screenshot({path:screenshotPath('arcade-swipe-next.png')});
await touchDrag(60,330,330,330);check(await focus()===f0,'touch swipe right: back to the previous game');
await touchDrag(70,330,330,330);check(await focus()===f0,'first game: swiping further back stays put');
await touchDrag(200,330,230,330);check(await focus()===f0,'a short drag changes nothing');
await touchDrag(200,250,215,520);check(await focus()===f0,'a vertical drag changes nothing');
// a quick flick counts even when short
await touchDrag(250,330,150,330,3,8);check(await focus()===f0+1,'a quick flick moves on');
// start the swipe on the Play button: next game, and no launch
const btn=await page.evaluate(()=>{const b=document.querySelector('.arc-actions button');const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
await touchDrag(btn.x+60,btn.y,btn.x-200,btn.y);
check(await focus()===f0+2,'a swipe starting on the Play button moves on');
check(!(await page.evaluate(()=>!!window.ShambConkins.store.session||!!document.querySelector('#dialog[open]'))),'and does not start the game');
// a mouse drag works too (desktop)
await page.mouse.move(330,330);await page.mouse.down();for(let k=1;k<=10;k++){await page.mouse.move(330-27*k,330);await page.waitForTimeout(12);}await page.mouse.up();await page.waitForTimeout(700);
check(await focus()===f0+3,'mouse drag left: next game');
// taps still work: the star toggles, a tile tap focuses that tile
const star=await page.evaluate(()=>document.querySelector('.arc-actions [data-arc-star]')?.classList.contains('on'));
await page.tap('.arc-actions [data-arc-star]');await page.waitForTimeout(300);
check(await page.evaluate(()=>document.querySelector('.arc-actions [data-arc-star]')?.classList.contains('on'))!==star,'tapping the star still works after a swipe');
await page.tap('.arc-actions [data-arc-star]');
await page.evaluate(()=>{document.querySelectorAll('.arcade-console .arc-tile')[0].click();});await page.waitForTimeout(500);check(await focus()===0,'tapping a tile still focuses it');
// the tile row still scrolls sideways by itself (no game change)
const before=await focus(),sl=await page.evaluate(()=>document.querySelector('.arc-row').scrollLeft);
const rowY=await page.evaluate(()=>{const r=document.querySelector('.arc-row').getBoundingClientRect();return r.top+r.height/2;});
await touchDrag(330,rowY,60,rowY);check(await focus()===before,'dragging the tile row does not change game');
console.log('     row scroll',sl,'→',await page.evaluate(()=>document.querySelector('.arc-row').scrollLeft));
const errs=errors.filter(x=>!/favicon|net::|Failed to load resource/.test(x));check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'ARCADE SWIPE OK');process.exit(bad?1:0);
