// SIMON (engines/partySimon.js, simonArt.js, simonSound.js): real taps on the drawn toy at three screen sizes: P1 starts the
// pattern, P2 watches the playback (pads light one at a time), repeats it and adds one, P1 slips = the razz with the right
// pad lit, the result card, FINISH; then 1 Player vs the CPU to a result. Screenshots simon-*.png.
// Usage: node tests/simon.mjs   (SHAMB_URL=... for a served build)
import {launchBrowser,screenshotPath,appURL} from './lib.mjs';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const browser=await launchBrowser();
async function open(w,h,solo=false){const page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();page.__e=[];page.on('pageerror',e=>page.__e.push(e.message));
 await page.goto(await appURL(),{timeout:180000});await page.waitForSelector('.title-screen',{timeout:90000});await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:90000});
 await page.evaluate(v=>{const S=window.ShambConkins;S.store.profile.settings.sound=true;S.store.profile.settings.solo=v?{on:true,who:0,level:'normal'}:{on:false,who:0,level:'normal'};S.requestGame({id:'simon-faceoff',origin:'arcade',solo:v,quick:true});},solo);
 return page;}
const D=(page,fn,arg)=>page.evaluate(fn,arg);
const S=page=>D(page,()=>{const d=window.ShambConkins.store.session?.debug;return d?{phase:d.phase(),seq:[...d.seq],lit:d.lit(),score:[...d.score]}:null;});
const pass=async page=>{await page.waitForSelector('.pass-overlay button',{timeout:20000});await page.waitForTimeout(250);await page.locator('.pass-overlay button').filter({hasNotText:'Exit'}).last().click();};
const waitPhase=(page,ph,ms=15000)=>page.waitForFunction(p=>window.ShambConkins.store.session?.debug?.phase?.()===p,ph,{timeout:ms});
async function tap(page,q,hold=60){const p=await D(page,q=>window.ShambConkins.store.session.debug.pad(q),q);const box=await page.locator('#game-canvas').boundingBox();
 await page.mouse.move(box.x+p.x,box.y+p.y);await page.mouse.down();await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(120);}
for(const [w,h] of [[390,780],[844,390],[1100,700]]){const tag=`${w}x${h}`,page=await open(w,h);
 await pass(page);await waitPhase(page,'input');
 await page.screenshot({path:screenshotPath(`simon-${tag}-start.png`)});
 await tap(page,1,250);
 let st=await S(page);check(st.seq.length===1&&st.seq[0]===1,tag+' P1 taps the red pad (top right) and starts the pattern');
 await pass(page);await waitPhase(page,'watch');
 const seen=[];for(let i=0;i<40;i++){const s=await S(page);if(s.phase!=='watch')break;s.lit.forEach((on,q)=>{if(on&&seen.at(-1)!==q)seen.push(q);});if(i===3)await page.screenshot({path:screenshotPath(`simon-${tag}-lit.png`)});await page.waitForTimeout(60);}
 check(seen.join()==='1',tag+' P2 watches the red pad light ('+seen.join()+')');
 await waitPhase(page,'input');await tap(page,1);await tap(page,2,150);
 st=await S(page);check(st.seq.join()==='1,2'&&st.score[1]===2,tag+' P2 repeats red, adds yellow ('+st.seq.join()+')');
 await pass(page);await waitPhase(page,'input');await tap(page,3);
 await page.waitForTimeout(150);st=await S(page);
 check(st.lit[1]&&!st.lit[3],tag+' a wrong pad: the right one (red) lights for the razz');
 await page.screenshot({path:screenshotPath(`simon-${tag}-razz.png`)});
 await waitPhase(page,'over',6000);await page.waitForTimeout(300);await page.screenshot({path:screenshotPath(`simon-${tag}-over.png`)});
 const box=await page.locator('#game-canvas').boundingBox(),btn=await D(page,()=>{const s=window.ShambConkins.store.session;return null;});
 // FINISH sits at the bottom of the card: tap it via the layout the game stored
 const b=await D(page,()=>{const s=window.ShambConkins.store.session;return s.debug&&s.debug.btn?s.debug.btn():null;});
 if(b){await page.mouse.click(box.x+b.x+b.w/2,box.y+b.y+b.h/2);}else await D(page,()=>window.ShambConkins.store.session.debug.finish());
 await page.waitForFunction(()=>!window.ShambConkins.store.session||window.ShambConkins.store.session.finished||document.querySelector('.result-card,.dialog-content,#dialog[open]'),null,{timeout:15000}).catch(()=>{});
 check(!(await D(page,()=>window.ShambConkins.store.session?.debug?.phase?.()==='over')),tag+' FINISH ends the game');
 check(!page.__e.length,tag+' no page errors '+page.__e.join(' | '));
 await page.context().close();}
// 1P: the toy is the menu; the red pad = VS CPU
{const page=await open(390,780,true);await waitPhase(page,'menu');await page.waitForTimeout(400);
 await page.screenshot({path:screenshotPath('simon-menu-390x780.png')});await tap(page,1);await pass(page);
 for(let r=0;r<12;r++){await waitPhase(page,'input',20000).catch(()=>{});const st=await S(page);if(!st||st.phase==='over')break;
  if(st.phase==='input'){for(const q of st.seq)await tap(page,q);await tap(page,r%4);}
  await page.waitForTimeout(400);if(await page.locator('.pass-overlay button').count())await pass(page).catch(()=>{});}
 const st=await S(page);check(st&&st.seq.length>=4,'1P vs CPU: the CPU repeats and adds (pattern '+st?.seq.length+')');
 check(!page.__e.length,'1P no page errors '+page.__e.join(' | '));await page.context().close();}
// 1P CLASSIC: green pad; skill switch cycles; Simon adds a pad each round; skill 1 = win at 8; a slip = razz; LAST; FINISH
for(const [w,h] of [[390,780],[844,390]]){const tag='classic-'+w+'x'+h,page=await open(w,h,true);await waitPhase(page,'menu');
 const C=f=>D(page,f),box=await page.locator('#game-canvas').boundingBox();
 const sk0=await C(()=>JSON.parse(localStorage.getItem('sc-simon-skill')||'1'));
 const sp=await C(()=>window.ShambConkins.store.session.debug.spots());
 await page.mouse.click(box.x+sp.skill.x+sp.skill.w/2,box.y+sp.skill.y+sp.skill.h/2);
 const sk1=await C(()=>+localStorage.getItem('sc-simon-skill'));check(sk1===sk0%4+1,tag+' tapping SKILL moves the switch ('+sk0+' -> '+sk1+')');
 await tap(page,0);await waitPhase(page,'ready');await C(()=>window.ShambConkins.store.session.debug.classic.skill(1));
 await page.screenshot({path:screenshotPath(`simon-${tag}-ready.png`)});
 const start=async()=>{const sp=await C(()=>window.ShambConkins.store.session.debug.spots());await page.mouse.click(box.x+sp.start.x,box.y+sp.start.y);};
 await start();let won=false,shot=false;
 for(let r=0;r<12;r++){await page.waitForFunction(()=>{const p=window.ShambConkins.store.session.debug.phase();return p==='input'||p==='ready';},null,{timeout:30000});
  const st=await S(page);if(st.phase==='ready'){won=true;break;}
  for(const q of st.seq){if(!shot&&q===3){await (async()=>{const p=await D(page,q=>window.ShambConkins.store.session.debug.pad(q),3);await page.mouse.move(box.x+p.x,box.y+p.y);await page.mouse.down();await page.waitForTimeout(150);
     await page.screenshot({path:screenshotPath(`simon-${tag}-blue.png`)});await page.mouse.up();await page.waitForTimeout(120);})();shot=true;}else await tap(page,q);}}
 let cs=await C(()=>window.ShambConkins.store.session.debug.classic.state());
 check(won&&cs.lastLen===8&&cs.wonAny,tag+' Simon adds a pad each round; 8 in a row beats skill 1 ('+JSON.stringify(cs)+')');
 await start();await waitPhase(page,'input',20000);await C(()=>window.ShambConkins.store.session.debug.classic.wrong());await page.waitForTimeout(200);
 const lit=(await S(page)).lit;check(lit.some(Boolean),tag+' a slip: the razz with the right pad lit');
 await waitPhase(page,'ready',8000);cs=await C(()=>window.ShambConkins.store.session.debug.classic.state());
 check(cs.games===2&&cs.best===8&&cs.lastLen===0,tag+' game over after the slip, best stays 8');
 const sp2=await C(()=>window.ShambConkins.store.session.debug.spots());await page.mouse.click(box.x+sp2.last.x,box.y+sp2.last.y);await page.waitForTimeout(100);
 check((await S(page)).phase==='watch',tag+' LAST replays the last pattern');await waitPhase(page,'ready',8000);
 await page.screenshot({path:screenshotPath(`simon-${tag}-over.png`)});
 const b=await C(()=>window.ShambConkins.store.session.debug.btn());check(!!b,tag+' FINISH button shown');
 if(b)await page.mouse.click(box.x+b.x+b.w/2,box.y+b.y+b.h/2);
 await page.waitForFunction(()=>!window.ShambConkins.store.session||window.ShambConkins.store.session.finished,null,{timeout:15000}).catch(()=>{});
 check(await C(()=>!window.ShambConkins.store.session||!!window.ShambConkins.store.session.finished),tag+' FINISH ends the run');
 check(!page.__e.length,tag+' no page errors '+page.__e.join(' | '));await page.context().close();}
await browser.close();console.log(bad?`${bad} FAILED`:'all ok');process.exit(bad?1:0);
