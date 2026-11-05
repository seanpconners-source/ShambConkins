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
 // Title tile pictures fade into each other (an older CSS rule used to switch the fade off: a one-frame cut, the owner's flicker)
 const fade=await page.evaluate(()=>[...document.querySelectorAll('.title-screen .ts-reel img')].filter(i=>!/opacity/.test(getComputedStyle(i).transitionProperty)).length);if(fade)fail(tag+' '+fade+' title pictures have no fade');
 await page.click('[data-action="arcade"]');await page.waitForSelector('.arcade-console');await page.waitForTimeout(400);
 // Featured is what the Arcade opens on; the star keeps a game on Favorites (survives a reload of the shelf); a game started shows on Recent
 const shelf=await page.evaluate(()=>({on:document.querySelector('.arc-pill.on')?.dataset.id,n:document.querySelectorAll('.arc-tile').length,first:document.querySelector('.arc-title')?.textContent}));
 if(shelf.on!=='featured'||shelf.n<5)fail(tag+' Arcade should open on Featured: '+JSON.stringify(shelf));
 await page.click('.arc-info .arc-star');const starred=await page.evaluate(()=>window.ShambConkins.store.profile.favorites?.length);if(starred!==1)fail(tag+' star did not save a favorite');
 await page.click('.arc-pill[data-id="favorites"]');await page.waitForTimeout(250);if(await page.locator('.arc-tile').count()!==1)fail(tag+' Favorites shelf should list the starred game');
 await page.click('.arc-info .arc-star');await page.click('.arc-pill[data-id="recent"]');await page.waitForTimeout(250);
 if(await page.evaluate(()=>!window.ShambConkins.store.profile.recent?.length)&&await page.locator('.arc-empty').count()!==1)fail(tag+' empty Recent shelf has no message');
 await page.click('.arc-pill[data-id="all"]');await page.waitForTimeout(400);
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
  const cols=await page.evaluate(()=>{const v=[...document.querySelectorAll('.arc-ver')].map(x=>x.offsetTop);return new Set(v.map(Math.round)).size;});
  if(vp.width>=700&&cols>1)fail(tag+' version tiles not side by side on a wide screen');
  await page.screenshot({path:screenshotPath(`ac-family-${tag}.png`)});
  await page.click('[data-arc-close]');await page.waitForTimeout(200);
 }
 if(vp.width===390){
  // View all: every tile as big blocks; picking one closes the grid and focuses it
  await page.click('[data-arc-all]');await page.waitForTimeout(700);
  const blocks=await page.locator('.arc-grid-page:not([hidden]) .arc-block').count();if(blocks!==info.tiles)fail('view all shows '+blocks+' of '+info.tiles);
  await page.screenshot({path:screenshotPath(`ac-viewall-${tag}.png`)});
  await page.click('.arc-block >> nth=7');await page.waitForTimeout(500);
  if(await page.locator('.arc-grid-page:not([hidden])').count())fail('view all did not close after a pick');
  // categories that make sense: Action has Broforce, Pinball has the 3 tables, Board & cards has chess
  for(const [cat,re,min] of [['action',/Sean of a Gun|Broforce/,1],['pinball',/Pinball/,3],['board',/Chess/,4]]){await page.click(`.arc-pill[data-id="${cat}"]`);await page.waitForTimeout(300);
   const labels=await page.evaluate(()=>[...document.querySelectorAll('.arc-tile')].map(t=>t.getAttribute('aria-label')));if(labels.length<min||!labels.some(l=>re.test(l)))fail(`category ${cat}: ${labels.length} ${labels.slice(0,4)}`);}
  await page.click('.arc-pill[data-id="all"]');await page.waitForTimeout(300);
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
  // Hangman is one game on every shelf: one tile, and its page lists all three versions (owner, Nov 3)
  for(const cat of ['featured','puzzle','all']){await page.click(`.arc-pill[data-id="${cat}"]`);await page.waitForTimeout(250);
   const hm=await page.evaluate(()=>[...document.querySelectorAll('.arc-tile')].map(t=>t.getAttribute('aria-label')).filter(l=>/hangman/i.test(l)));if(hm.join()!=='Hangman Unchained')fail(cat+' Hangman tiles: '+hm);}
  await page.click('.arc-pill[data-id="featured"]');await page.waitForTimeout(250);await page.click('.arc-tile[aria-label="Hangman Unchained"]');await page.waitForTimeout(300);if(!await page.locator('.arc-fam:not([hidden])').count())await page.click('[data-arc-family]');await page.waitForTimeout(450);
  const hmv=await page.locator('.arc-fam:not([hidden]) .arc-ver').count();if(hmv!==3)fail('Hangman page from Featured lists '+hmv+' versions');await page.click('[data-arc-close]');await page.waitForTimeout(300);
  // Casino is one game too (owner, Nov 5): one Casino Night tile on every shelf, its page lists the tables
  for(const cat of ['featured','casino','board','all']){await page.click(`.arc-pill[data-id="${cat}"]`);await page.waitForTimeout(250);
   const cs=await page.evaluate(()=>[...document.querySelectorAll('.arc-tile')].map(t=>t.getAttribute('aria-label')).filter(l=>/casino|blackjack|roulette|baccarat|poker|five.card|liar/i.test(l)));if(cat!=='board'&&cs.join()!=='Casino Night'||cat==='board'&&cs.length&&cs.join()!=='Casino Night')fail(cat+' casino tiles: '+cs);}
  await page.click('.arc-pill[data-id="featured"]');await page.waitForTimeout(250);await page.click('.arc-tile[aria-label="Casino Night"]');await page.waitForTimeout(300);if(!await page.locator('.arc-fam:not([hidden])').count())await page.click('[data-arc-family]');await page.waitForTimeout(450);
  const csv=await page.locator('.arc-fam:not([hidden]) .arc-ver').count();if(csv<4)fail('Casino page from Featured lists '+csv+' tables');await page.click('[data-arc-close]');await page.waitForTimeout(300);
  // The dice opens a random game's own page (hero, rules, Play): never the game or a Ready card (owner, Nov 3)
  await page.click('.arc-pill[data-id="featured"]');await page.waitForTimeout(300);
  for(let k=0;k<25;k++){await page.click('.arc-top [data-action="arcade-random"]');await page.waitForTimeout(120);
   const d=await page.evaluate(()=>{const S=window.ShambConkins.store,t=document.querySelector('.arc-tile.on');return {session:!!S.session,dlg:!!document.querySelector('#dialog[open]'),gb:S.view,tile:t?.getAttribute('aria-label'),fam:!!t?.querySelector('.arc-count'),hero:document.querySelector('.arc-info .arc-title')?.textContent,play:!!document.querySelector('.arc-info .arc-actions')?.children.length};});
   if(d.session||d.dlg)fail('the dice started something: '+JSON.stringify(d));if(!d.tile||(d.fam&&!/Hangman|Casino/.test(d.tile))||!d.play||!d.hero)fail('the dice should show one game\'s page: '+JSON.stringify(d));}
  // Changing tile: a background picture stays up the whole time, the plain colour behind it never shows (owner, Nov 3)
  await page.click('.arc-pill[data-id="all"]');await page.waitForTimeout(300);
  const keyed=await page.evaluate(()=>{const S=window.ShambConkins,ts=[...document.querySelectorAll('.arc-tile')];return ts.map((t,i)=>[i,t]).filter(([i,t])=>!t.classList.contains('on')&&/^(Mario Kart|DOOM|Casino Night|Clue|Monopoly|Castlevania)$/.test(t.getAttribute('aria-label'))).map(x=>x[0]);});
  await page.evaluate(()=>{window.__bare=0;window.__frames=0;const tick=()=>{if(window.__stop)return;const r=document.querySelector('.arcade-console');if(r?.classList.contains('has-key')){window.__frames++;if(![...r.querySelectorAll('.arc-keyart img:not(.arc-keyfill)')].some(i=>i.complete&&i.naturalWidth))window.__bare++;}requestAnimationFrame(tick);};tick();});
  for(const i of keyed.slice(0,5)){await page.click(`.arc-tile >> nth=${i}`);await page.waitForTimeout(700);}
  const seen=await page.evaluate(()=>{window.__stop=1;return {bare:window.__bare,frames:window.__frames};});console.log('background swap',JSON.stringify(seen));
  if(keyed.length<3)fail('too few tiles with backgrounds to test: '+keyed.length);if(seen.bare)fail(`no background picture on screen for ${seen.bare} of ${seen.frames} frames`);
  // Broforce is one tile; its play button starts the launcher and opens the world select
  const bro=await page.evaluate(()=>[...document.querySelectorAll('.arc-tile')].findIndex(t=>/Sean of a Gun|Broforce/.test(t.getAttribute('aria-label'))));
  if(await page.evaluate(()=>[...document.querySelectorAll('.arc-tile')].filter(t=>/Sean of a Gun|Broforce/.test(t.getAttribute('aria-label'))).length)!==1)fail('Broforce should be one tile');
   await page.click(`.arc-tile >> nth=${bro}`);await page.waitForTimeout(450);
  await page.click('.arc-info [data-action="arcade-game"]');await page.waitForTimeout(1500);
  const started=await page.evaluate(()=>({session:!!window.ShambConkins?.store?.session,card:/Start game/.test(document.querySelector('#dialog[open]')?.innerText||'')}));
  if(!started.session)fail('play button did not start Broforce');if(started.card)fail('the Start game / Back to arcade card still shows');
   if(await page.locator('.bf-world').count()!==4)fail('Broforce world select should show 4 worlds');
   await page.click('.bf-world[data-world="broforce-city"]');await page.waitForTimeout(800);
   const picked=await page.evaluate(()=>({phase:window.ShambConkins.store.session?.debug?.phase,left:document.querySelectorAll('.bf-worlds').length}));if(picked.phase==='world'||picked.left)fail('picking a world should start the mission '+JSON.stringify(picked));
 }
 const errs=errors.filter(x=>!/favicon|net::|Failed to load resource/.test(x));if(errs.length)fail(tag+' page errors '+errs.slice(0,3).join(' | '));
 await browser.close();
}
console.log(bad?`${bad} problem(s)`:'arcade console OK');process.exit(bad?1:0);
