// Console Arcade (src/arcadeConsole.js) + new title screen: screenshots at phone / open Fold / desktop / landscape,
// checks the tile row, hero focus, version page (tiles), filters, search, 1P mode and that a game still starts from
// the hero's play button. Usage: node tests/arcade-console.mjs   (SHAMB_URL=http://localhost:8123/ for a --pwa build)
import {open, screenshotPath} from './lib.mjs';
const sizes=[{width:390,height:780},{width:740,height:820},{width:1100,height:700},{width:780,height:390}];
let bad=0;const fail=m=>{bad++;console.log('FAIL',m);};
for(const vp of sizes){
 const tag=`${vp.width}x${vp.height}`;
 const {browser,page,errors}=await open({viewport:vp});
 await page.waitForTimeout(600);
 await page.screenshot({path:screenshotPath(`ac-home-${tag}.png`)});
 const homeX=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(homeX)fail(tag+' home scrolls sideways');
 await page.click('[data-action="arcade"]');await page.waitForSelector('.arcade-console');await page.waitForTimeout(400);
 const info=await page.evaluate(()=>{const r=document.querySelector('.arcade-console'),tiles=[...r.querySelectorAll('.arc-tile')];
  return {tiles:tiles.length,fams:r.querySelectorAll('.arc-count').length,cuts:r.querySelectorAll('.arc-tile .arc-cut').length,emoji:r.querySelectorAll('.arc-tile .arc-emoji').length,
   overX:document.documentElement.scrollWidth>innerWidth+1,overY:r.scrollHeight>r.clientHeight+2,title:r.querySelector('.arc-title')?.textContent,
   rowBottom:r.querySelector('.arc-row').getBoundingClientRect().bottom,h:innerHeight};});
 console.log(tag,JSON.stringify(info));
 if(info.tiles<40)fail(tag+' too few tiles '+info.tiles);if(info.fams<10)fail(tag+' families missing');if(info.overX)fail(tag+' arcade scrolls sideways');
 if(info.rowBottom>info.h+1)fail(tag+' tile row off screen');
 await page.screenshot({path:screenshotPath(`ac-arcade-${tag}.png`)});
 // focus the 6th tile, then a family tile twice (second tap opens its version page)
 await page.click('.arc-tile >> nth=5');await page.waitForTimeout(450);
 const t2=await page.locator('.arc-title').first().textContent();if(t2===info.title)fail(tag+' focus did not change the hero');
 await page.screenshot({path:screenshotPath(`ac-focus-${tag}.png`)});
 const famIdx=await page.evaluate(()=>[...document.querySelectorAll('.arc-tile')].findIndex(t=>/Pinball/.test(t.getAttribute('aria-label'))));
 if(famIdx<0)fail(tag+' no pinball family');else{
  await page.click(`.arc-tile >> nth=${famIdx}`);await page.waitForTimeout(300);await page.click('[data-arc-family]');await page.waitForTimeout(500);
  const vers=await page.locator('.arc-fam:not([hidden]) .arc-ver').count();if(vers!==3)fail(tag+' pinball versions '+vers);
  const cols=await page.evaluate(()=>{const v=[...document.querySelectorAll('.arc-ver')].map(x=>x.getBoundingClientRect().top);return new Set(v.map(Math.round)).size;});
  if(vp.width>=700&&cols>1)fail(tag+' version tiles not side by side on a wide screen');
  await page.screenshot({path:screenshotPath(`ac-family-${tag}.png`)});
  await page.click('[data-arc-close]');await page.waitForTimeout(200);
 }
 if(vp.width===390){
  // bosses family exists, filters, search, 1P strip
  await page.click('.arc-pill[data-id="boss"]');await page.waitForSelector('.arcade-console');await page.waitForTimeout(300);
  const bosses=await page.locator('.arc-tile').count();if(bosses<30)fail('boss filter shows '+bosses);
  await page.screenshot({path:screenshotPath(`ac-bosses-${tag}.png`)});
  await page.click('.arc-pill[data-id="all"]');await page.waitForTimeout(300);
  await page.click('[data-arc-search]');await page.fill('#catalog-search','sonic');await page.waitForTimeout(500);
  const hits=await page.locator('.arc-tile').count();if(hits<1||hits>4)fail('search sonic gave '+hits);
  await page.fill('#catalog-search','');await page.waitForTimeout(300);
  await page.click('.solo-seg[data-key="on"][data-value="1"]');await page.waitForTimeout(400);
  await page.screenshot({path:screenshotPath(`ac-solo-${tag}.png`)});
  await page.click('.solo-seg[data-key="on"][data-value="0"]');await page.waitForTimeout(300);
  // play a game from the hero: Broforce family → version page → first version's play button starts the launcher
  const bro=await page.evaluate(()=>[...document.querySelectorAll('.arc-tile')].findIndex(t=>/Broforce/.test(t.getAttribute('aria-label'))));
  await page.click(`.arc-tile >> nth=${bro}`);await page.waitForTimeout(250);await page.click('[data-arc-family]');await page.waitForTimeout(300);
  await page.click('.arc-ver >> nth=0 >> [data-action="arcade-game"]');await page.waitForTimeout(1500);
  const started=await page.evaluate(()=>!!document.querySelector('#dialog[open]')||!!window.ShambConkins?.store?.session||!!document.querySelector('.game-body,.game-shell'));
  if(!started)fail('play button did not start Broforce');
 }
 const errs=errors.filter(x=>!/favicon|net::|Failed to load resource/.test(x));if(errs.length)fail(tag+' page errors '+errs.slice(0,3).join(' | '));
 await browser.close();
}
console.log(bad?`${bad} problem(s)`:'arcade console OK');process.exit(bad?1:0);
