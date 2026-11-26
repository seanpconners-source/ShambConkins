// THE PRICE IS RIGHT, the whole episode (tpir/guide.js + tpir/episode.js): the TV guide comes up, a real tap on THE PRICE IS RIGHT
// row tunes in (static + channel number), then the whole show runs to the tally (globalThis.__tpirAuto: the game also plays the
// players' pricing games; bids and wheel spins by the engines' debug hooks, every wait hurried). Screenshots of every part.
// Usage: node tests/tpir-episode.mjs [WxH] [vs|alone|2p]   (SHAMB_URL=...)
import {launchBrowser,screenshotPath,appURL} from './lib.mjs';
const [w,h]=(process.argv[2]||'390x780').split('x').map(Number),modeArg=process.argv[3]||'vs',mode=modeArg.replace(/-win$/,''),tag=`${w}x${h}-${modeArg}`;
const browser=await launchBrowser(),page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('  PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error'||/engine failure|episode segment/i.test(m.text())){console.log('  CONSOLE',m.text().slice(0,300));if(/engine failure|episode segment/i.test(m.text()))errors.push(m.text());}});
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
await page.goto((await appURL()),{timeout:180000});await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
await page.evaluate(([m,mw])=>{const S=window.ShambConkins;globalThis.__tpirAuto=true;globalThis.__tpirSharp=true;globalThis.__tpirWin=mw.endsWith('win');if(m==='2p'){S.store.profile.settings.solo={on:false,who:0,level:'normal'};S.requestGame({id:'price-bid-off',origin:'arcade',quick:true});}
 else{S.store.profile.settings.solo={on:true,who:0,level:'normal'};S.requestGame({id:'price-bid-off',origin:'arcade',solo:true,quick:true});}},[mode,modeArg]);
await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.guide,null,{timeout:30000});await page.waitForTimeout(3000);
await page.screenshot({path:screenshotPath(`tpe-guide-${tag}.png`)});
// a real tap on a highlighted PRICE IS RIGHT listing (guide coordinates -> the screen on the TV)
const box=await page.locator('#game-canvas').boundingBox();
const hit=await page.evaluate(()=>{const D=window.ShambConkins.store.session.debug;const h=D.hits.find(h=>h.pick==='episode');return h&&{...h,sc:D.screen};});
check(!!hit,'the guide shows a Price Is Right listing to tap');
if(hit){const sc=hit.sc,px=box.x+sc.x+(hit.x+hit.w/2)/720*sc.w,py=box.y+sc.y+(hit.y+hit.h/2)/540*sc.h;await page.mouse.click(px,py);}
// 1 player: the guide scrolls down to PLAY ALONE / VS CPU on the guide itself; a real tap on one tunes in
if(mode!=='2p'){await page.waitForFunction(()=>window.ShambConkins.store.session.debug.phase==='pick',null,{timeout:5000}).catch(()=>{});await page.waitForTimeout(900);
 await page.screenshot({path:screenshotPath(`tpe-pick-${tag}.png`)});
 const h2=await page.evaluate(m=>{const D=window.ShambConkins.store.session.debug;const h=D.hits.find(h=>h.pick===(m==='alone'?'alone':'cpu'));return h&&{...h,sc:D.screen};},mode);
 check(!!h2,'the guide shows PLAY ALONE / VS CPU after the tap');
 if(h2){const sc=h2.sc,px=box.x+sc.x+(h2.x+h2.w/2)/720*sc.w,py=box.y+sc.y+(h2.y+h2.h/2)/540*sc.h;await page.mouse.click(px,py);}}
await page.waitForTimeout(500);await page.screenshot({path:screenshotPath(`tpe-static-${tag}.png`)});
check(await page.evaluate(()=>window.ShambConkins.store.session.debug.phase)!=='guide','the tap tunes the TV in');
await page.waitForTimeout(1200);await page.screenshot({path:screenshotPath(`tpe-channel-${tag}.png`)});
// drive the show
const seen=new Set(),shots=new Set(),t0=Date.now();let last='';
while(Date.now()-t0<900000){const st=await page.evaluate(()=>{const S=window.ShambConkins.store,ss=S.session;if(!ss)return {over:true};const D=ss.debug||{};
  let what=D.episode?'ep:'+D.scene:D.C?'wheel':D.seats?'row':D.cases?'showcase':D.P?'game':'?';
  const slow=/^ep:(family|tally|credits|signoff)$/.test(what);
  try{if(D.waiting&&D.autoBid)D.autoBid();if(D.cases&&D.choose)D.choose('pass');if(D.C&&D.mode==='pull')D.spin(10+Math.random()*12);if(D.C&&D.mode==='choose')D.choose('stay');if(!slow)D.hurry=true;}catch(e){}
  return {what,over:false};});
 if(st.over)break;if(!seen.has(st.what)){seen.add(st.what);console.log('  part:',st.what,Math.round((Date.now()-t0)/1000)+'s');}
 if(st.what!==last&&!shots.has(st.what)){shots.add(st.what);await page.waitForTimeout(1500);await page.screenshot({path:screenshotPath(`tpe-${st.what.replace(':','-')}-${tag}.png`)});}
 last=st.what;await page.waitForTimeout(250);
 if(st.what==='ep:tally'){await page.waitForTimeout(2500);await page.screenshot({path:screenshotPath(`tpe-tally-${tag}.png`)});const T=await page.evaluate(()=>window.ShambConkins.store.session?.debug?.tally);console.log('  tally',JSON.stringify(T));}}
// the show branches now (owner, Nov 26: out on the row / the wheel / the Showcase = goodbye, no ending): always the open, a row, a
// game, the tally; the rest is reported
for(const p of ['ep:open','row','game','ep:tally'])check(seen.has(p),'the show reached '+p);
console.log('  path:',[...seen].join(' > '));
if(seen.has('ep:family'))for(const p of ['ep:signoff','ep:credits'])check(seen.has(p),'the ending has '+p);
const res=await page.evaluate(()=>document.querySelector('#dialog[open]')?.innerText?.slice(0,200)||'');check(/PRICE IS RIGHT|\$/.test(res)||!res,'result card: '+res.replace(/\n/g,' | '));
check(!errors.length,'no page errors '+errors.slice(0,4).join(' / '));
await browser.close();console.log(bad?`EXIT 1 (${bad} failed)`:'EXIT 0');process.exit(bad?1:0);
