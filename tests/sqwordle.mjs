// SQWORDLE (engines/sqwordle.js): the rules in Node (colours with repeated letters, points, word lists), then real games
// in the browser at three screen sizes: typing on the real keyboard and on the drawn keys, a word not in the list shakes,
// ENTER flips a row, a win (and Squirtle's move for it), the two-player results card and the finish; then 1 Player word after word until a miss.
// Usage: node tests/sqwordle.mjs   (SHAMB_URL=... for a served build); screenshots sqw-*.png
import {launchBrowser,screenshotPath,appURL} from './lib.mjs';
import {req} from './load.mjs';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
{const {grade,points}=req('src/engines/sqwordleRules.js'),{ANSWERS,VALID}=req('src/data/sqwordleWords.js'),g=(a,b)=>grade(a,b).join('');
 check(g('shell','shell')==='22222','all blue');check(g('crane','shell')==='00001'&&g('lisle','shell')==='10121','a repeated letter only colours as often as the answer has it');
 check(g('sleep','shell')==='21200','S and the first E in place, L elsewhere, the second E and P grey'); check(g('allee','eagle')==='11012','the second L and the third E go grey once the answer\'s are used up');
 check(ANSWERS.length>=1500&&ANSWERS.every(w=>/^[a-z]{5}$/.test(w)&&VALID.has(w)),`${ANSWERS.length} answers, all real five-letter words the game accepts`);
 check(new Set(ANSWERS).size===ANSWERS.length,'no answer twice');check(VALID.size>10000,`${VALID.size} words accepted as guesses`);
 check(points({win:true,n:3,secs:30})>points({win:true,n:4,secs:5})&&points({win:true,n:3,secs:20})>points({win:true,n:3,secs:60})&&points({win:false,best:3})===30,'points: fewer guesses first, then the clock; a miss scores its blue tiles');}
const browser=await launchBrowser();
async function open(w,h,solo=false){const page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();page.__e=[];page.on('pageerror',e=>page.__e.push(e.message));
 await page.goto(await appURL(),{timeout:180000});await page.waitForSelector('.title-screen',{timeout:90000});await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:90000});
 await page.evaluate(v=>{const S=window.ShambConkins;S.store.profile.settings.solo=v?{on:true,who:0,level:'normal'}:{on:false,who:0,level:'normal'};S.requestGame({id:'sqwordle',origin:'arcade',solo:v,quick:true});},solo);
 return page;}
const D=(page,fn,arg)=>page.evaluate(fn,arg);
const ready=async page=>{await page.waitForSelector('.pass-overlay button',{timeout:20000});await page.waitForTimeout(250);await page.locator('.pass-overlay button').filter({hasNotText:'Exit'}).last().click();await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.board,null,{timeout:10000});await page.waitForTimeout(300);};
for(const [w,h] of [[390,780],[844,390],[1100,700]]){const tag=`${w}x${h}`,page=await open(w,h);
 await ready(page);
 const ans=await D(page,()=>window.ShambConkins.store.session.debug.answer());
 // a word that isn't a word: shakes, no row used
 await page.keyboard.type('qzxvj');await page.keyboard.press('Enter');await page.waitForTimeout(250);
 let b=await D(page,()=>{const b=window.ShambConkins.store.session.debug.board;return {rows:b.rows.length,cur:b.cur,shake:!!b.shake};});
 check(b.rows===0&&b.cur==='qzxvj'&&b.shake,tag+' a word not in the list shakes and uses no row');
 check((await D(page,()=>window.ShambConkins.store.session.debug.react()?.mood))==='think',tag+' the head by the title looks puzzled');
 for(let k=0;k<5;k++)await page.keyboard.press('Backspace');
 await page.screenshot({path:screenshotPath(`sqw-shake-${tag}.png`)});
 // one wrong guess typed on the drawn keys (tap them like a player)
 const wrong=ans==='crane'?'slate':'crane';
 await page.keyboard.type(wrong);await page.keyboard.press('Enter');await page.waitForTimeout(2000);
 b=await D(page,()=>{const b=window.ShambConkins.store.session.debug.board;return {rows:b.rows.length,res:b.rows[0]?.res.join('')};});
 check(b.rows===1&&b.res.length===5,tag+` "${wrong}" flipped: ${b.res}`);
 await page.screenshot({path:screenshotPath(`sqw-row-${tag}.png`)});
 await page.keyboard.type(ans);await page.keyboard.press('Enter');await page.waitForTimeout(2300);
 b=await D(page,()=>window.ShambConkins.store.session.debug.board.done);check(b==='win',tag+' the answer wins');
 b=await D(page,()=>window.ShambConkins.store.session.debug.show());check(b?.kind==='hydro'&&b.run,tag+' two guesses = Squirtle\'s Hydro Pump plays '+JSON.stringify(b));
 await page.screenshot({path:screenshotPath(`sqw-win-${tag}.png`)});
 // player 2: the same word, a miss in six
 await ready(page);const ans2=await D(page,()=>window.ShambConkins.store.session.debug.answer());check(ans2===ans,tag+' player 2 gets the same word');
 const misses=['crane','slate','pious','might','dumbo','fjord','vying'].filter(x=>x!==ans).slice(0,6);
 for(const m of misses){await page.keyboard.type(m);await page.keyboard.press('Enter');await page.waitForTimeout(1750);}
 b=await D(page,()=>window.ShambConkins.store.session.debug.board.done);check(b==='lose',tag+' six misses lose');
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.phase==='results',null,{timeout:10000}).catch(()=>{});
 await page.waitForTimeout(900);await page.screenshot({path:screenshotPath(`sqw-results-${tag}.png`)});
 await page.keyboard.press('Enter');await page.waitForTimeout(800);
 const end=await D(page,()=>({session:!!window.ShambConkins.store.session,dlg:document.getElementById('dialog')?.innerText.replace(/\s+/g,' ').slice(0,160)}));
 check(!end.session&&/wins|Sean|Amber/.test(end.dlg||''),tag+' finished: '+end.dlg);
 check(!page.__e.length,tag+' no page errors '+page.__e.join(' | '));await page.context().close();}
// 1 Player: word after word on the autopilot (two misses then the answer), until a forced miss ends the run
{const page=await open(390,780,true);await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.board,null,{timeout:20000});await page.waitForTimeout(300);// 1P starts straight on the first word
 for(let k=0;k<2;k++){const a=await D(page,()=>window.ShambConkins.store.session.debug.answer());await page.keyboard.type(a);await page.keyboard.press('Enter');await page.waitForTimeout(2600);await ready(page);}
 const st=await D(page,()=>window.ShambConkins.store.session.soloProgress);check(st?.level===2&&st.score>0,'1P: two words in a row '+JSON.stringify(st));
 for(const m of ['crane','slate','pious','might','dumbo','fjord','vying'].slice(0,6)){await page.keyboard.type(m);await page.keyboard.press('Enter');await page.waitForTimeout(1750);}
 await page.waitForTimeout(3000);const end=await D(page,()=>({session:!!window.ShambConkins.store.session,dlg:document.getElementById('dialog')?.innerText.replace(/\s+/g,' ').slice(0,200)}));
 check(!end.session&&/word|got away/i.test(end.dlg||''),'1P: a miss ends the run: '+end.dlg);check(!page.__e.length,'1P no page errors '+page.__e.join(' | '));await page.context().close();}
await browser.close();console.log(bad?`${bad} problem(s)`:'sqwordle OK');process.exit(bad?1:0);
