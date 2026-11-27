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
 // the TV guide comes first: channel 3 = the menu of single games (tests/tpir-episode.mjs covers the episode)
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.guide||window.ShambConkins.store.session?.debug?.menu,null,{timeout:20000});
 await page.evaluate(()=>{const D=window.ShambConkins.store.session.debug;if(D.guide)D.tune('menu');});
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.menu,null,{timeout:20000});
 await page.waitForTimeout(2600);await page.screenshot({path:screenshotPath(`tpir-menu-${tag}.png`)});
 // tap the card of the wanted game (cards are drawn on the canvas: find its box from the engine's layout by tapping candidates)
 const games=await page.evaluate(()=>window.ShambConkins.store.session.debug.games);check(games.includes('plinko-show')&&games.includes('big-wheel'),'the menu offers '+games.join(', '));
 await page.waitForFunction(id=>window.ShambConkins.store.session.debug.cards.some(c=>c.id===id),which,{timeout:8000}).catch(()=>{});
 const box=await page.locator('#game-canvas').boundingBox(),cards=await page.evaluate(()=>window.ShambConkins.store.session.debug.cards),cd=cards.find(c=>c.id===which);
 check(!!cd,`${which} has a card on screen`);await page.mouse.click(box.x+cd.x+cd.w/2,box.y+cd.y+cd.h/2);await page.waitForTimeout(150);
 const picked=await page.evaluate(()=>window.ShambConkins.store.session?.debug?.chosen??-1);check(games[picked]===which,'a real tap on its card picks '+which);
 await page.waitForFunction(()=>{const d=window.ShambConkins.store.session?.debug;return d&&!d.menu&&d.mode;},null,{timeout:15000});
 await page.waitForTimeout(2500);await page.screenshot({path:screenshotPath(`tpir-${which}-${tag}.png`)});
 if(which==='cliff-hangers'){ // real taps on the keypad: type a guess that's off, then watch him climb
  await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.mode==='guess'&&window.ShambConkins.store.session.debug.keys.length,null,{timeout:30000});
  const q=await page.evaluate(()=>{const D=window.ShambConkins.store.session.debug;return D.P[D.cur].prizes[D.pk];}),g=String(Math.max(1,q.price-7));
  const ks=await page.evaluate(()=>window.ShambConkins.store.session.debug.keys);for(const ch of [...g,'OK']){const k=ks.find(k=>k.l===ch);await page.mouse.click(box.x+k.x+k.w/2,box.y+k.y+k.h/2);await page.waitForTimeout(120);}
  await page.waitForTimeout(3200);await page.screenshot({path:screenshotPath(`tpir-cliff-climb-${tag}.png`)});
  const st=await page.evaluate(()=>{const D=window.ShambConkins.store.session.debug;return {steps:D.P[0].steps,guess:D.P[0].prizes[0].guess,pos:D.climber.pos};});
  check(st.guess===+g&&st.pos>0,`keypad guess $${g} on a $${q.price} prize: climber at ${st.pos.toFixed(1)} of ${q.price-+g}`);}
 if(which==='clock-game'){ // real keypad taps: three digits go in at once, the host answers HIGHER for a low guess
  await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.mode==='guess'&&window.ShambConkins.store.session.debug.keys.length,null,{timeout:30000});
  const ks=await page.evaluate(()=>window.ShambConkins.store.session.debug.keys);for(const ch of '101'){const k=ks.find(k=>k.l===ch);await page.mouse.click(box.x+k.x+k.w/2,box.y+k.y+k.h/2);await page.waitForTimeout(100);}
  await page.waitForTimeout(400);await page.screenshot({path:screenshotPath(`tpir-clock-call-${tag}.png`)});
  const st=await page.evaluate(()=>{const D=window.ShambConkins.store.session.debug;const q=D.P[0].prizes[0];return {g:q.guesses,left:D.P[0].left,want:q.price>101?'HIGHER':q.price<101?'LOWER':'WIN'};});
  // the call matches the real price (the catalog has prizes from $100 since v0.99.69)
  check(st.g.length===1&&st.g[0][0]===101&&st.g[0][1]===st.want&&st.left<30,`keypad guess $101 auto-submits: ${JSON.stringify(st.g)}, clock ${st.left.toFixed(1)} s`);}
 const S_=f=>page.evaluate(f),click=async b=>{await page.mouse.click(box.x+b.x+b.w/2,box.y+b.y+b.h/2);await page.waitForTimeout(150);};
 if(which==='range-game'){ // a real tap on the big stop button while the finder rises
  await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.rising&&window.ShambConkins.store.session.debug.cur===0&&window.ShambConkins.store.session.debug.button,null,{timeout:30000});await page.waitForTimeout(1500);
  const b=await S_(()=>window.ShambConkins.store.session.debug.button);await click(b);const st=await S_(()=>{const D=window.ShambConkins.store.session.debug;return {r:D.rising,f:D.P[0].f};});
  await page.screenshot({path:screenshotPath(`tpir-range-stop-${tag}.png`)});check(!st.r&&st.f>0&&st.f<1,`a tap on STOP stops the finder at ${st.f.toFixed(2)}`);}
 if(which==='safe-crackers'){ // real taps: the three digit tiles in the right order, then TRY THE COMBINATION
  await page.waitForFunction(()=>{const D=window.ShambConkins.store.session?.debug;return D&&D.mode==='input'&&D.cur===0&&D.hits.length>=3;},null,{timeout:30000});
  const p0=await S_(()=>window.ShambConkins.store.session.debug.P[0]);for(const ch of p0.code){const hs=await S_(()=>window.ShambConkins.store.session.debug.hits);const P=await S_(()=>window.ShambConkins.store.session.debug.P[0]);
   const free=P.digits.map((d,j)=>j).filter(j=>!P.slots.includes(j)),j=free.find(j=>P.digits[j]===ch),hit=hs[hs.length-free.length+free.indexOf(j)];await click(hit);}
  await page.screenshot({path:screenshotPath(`tpir-safe-dial-${tag}.png`)});const hs=await S_(()=>window.ShambConkins.store.session.debug.hits);await click(hs[hs.length-1]);
  await page.waitForTimeout(3500);await page.screenshot({path:screenshotPath(`tpir-safe-open-${tag}.png`)});const st=await S_(()=>window.ShambConkins.store.session.debug.P[0]);check(st.tried===st.code&&st.open,`taps dial ${st.tried} (code ${st.code}) and the safe opens`);}
 if(which==='race-game'){ // a real drag: a tag onto a podium
  await page.waitForFunction(()=>{const D=window.ShambConkins.store.session?.debug;return D&&D.mode==='input'&&D.cur===0;},null,{timeout:30000});await page.waitForTimeout(300);
  const t0b=await S_(()=>window.ShambConkins.store.session.debug.tagBox(0)),pd=await S_(()=>window.ShambConkins.store.session.debug.pods[2]);
  await page.mouse.move(box.x+t0b.x+t0b.w/2,box.y+t0b.y+t0b.h/2);await page.mouse.down();await page.mouse.move(box.x+pd.x+pd.w/2,box.y+pd.y+pd.h/2,{steps:8});await page.mouse.up();await page.waitForTimeout(200);
  const at=await S_(()=>window.ShambConkins.store.session.debug.P[0].at);check(at[2]===0,`dragging tag 1 onto prize 3 tags it: ${JSON.stringify(at)}`);
  await S_(()=>window.ShambConkins.store.session.debug.solve());await page.waitForTimeout(200);const lv=await S_(()=>window.ShambConkins.store.session.debug.lever);
  await page.mouse.click(box.x+lv.x,box.y+lv.y+lv.h*.4);await page.waitForTimeout(1600);await page.screenshot({path:screenshotPath(`tpir-race-lever-${tag}.png`)});
  const st=await S_(()=>window.ShambConkins.store.session.debug.P[0]);check(st.pulls>=1&&st.lights===4,`a tap on the lever with all four right lights ${st.lights}`);}
 if(which==='contestants-row'){ // the call-downs, then real keypad taps for player 1's bid
  await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.scene==='crowd',null,{timeout:30000});await page.waitForTimeout(1800);await page.screenshot({path:screenshotPath(`tpir-cr-call-${tag}.png`)});
  await page.waitForFunction(()=>{const D=window.ShambConkins.store.session?.debug;return D&&D.waiting&&D.keys.length;},null,{timeout:60000});await page.waitForTimeout(300);
  await page.screenshot({path:screenshotPath(`tpir-cr-bid-${tag}.png`)});const ks=await S_(()=>window.ShambConkins.store.session.debug.keys);
  const taken=await S_(()=>window.ShambConkins.store.session.debug.seats.map(o=>o.bid));let g=373;while(taken.includes(g))g++;
  for(const ch of [...String(g),'BID']){const k=ks.find(k=>k.l===ch);await click(k);}
  const st=await S_(()=>window.ShambConkins.store.session.debug.seats.find(o=>o.p===0).bid);check(st===g,`keypad bid $${g} lands on the podium: ${st}`);
  await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.seats?.every(o=>o.bid!=null),null,{timeout:30000}).catch(()=>{});await page.waitForTimeout(2600);await page.screenshot({path:screenshotPath(`tpir-cr-reveal-${tag}.png`)});}
 if(which==='punch-a-bunch'){ // real taps: HIGHER, then a hole
  await page.waitForFunction(()=>{const D=window.ShambConkins.store.session?.debug;return D&&D.phase==='ask'&&D.cur===0&&D.hits.length>=2;},null,{timeout:30000});
  const hs=await S_(()=>window.ShambConkins.store.session.debug.hits);await click(hs[hs.length-2]);const a=await S_(()=>window.ShambConkins.store.session.debug.P[0].prizes[0].ans);check(a==='h','a tap on HIGHER answers h');
  await page.screenshot({path:screenshotPath(`tpir-punch-ask-${tag}.png`)});}
 const t0=Date.now();let end='';
 while(Date.now()-t0<240000){const st=await page.evaluate(()=>{const S=window.ShambConkins.store,d=document.getElementById('dialog');if(d.open&&!S.session)return {done:d.innerText.replace(/\s+/g,' ').slice(0,160)};const D=S.session?.debug;if(!D)return {};
   D.hurry=true;if(D.autoBid&&D.waiting)D.autoBid();else if(D.mode==='guess'&&D.P&&D.guess){const q=D.P[D.cur].prizes[D.pk];D.guess(Math.max(1,q.price+Math.round((Math.random()-.5)*20)));}else if(D.price&&D.price.res==null){D.pick(0);}else if(D.mode==='aim'){D.drop();}else if(D.mode==='pull'){D.spin(14);}else if(D.mode==='choose'){D.choose('stay');}else if(D.rising!==undefined&&D.rising)D.stop();else if(D.tryIt&&D.mode==='input'&&!D.P[D.cur].tried)D.tryIt(D.P[D.cur].digits.join(''));else if(D.solve&&D.mode==='input'){D.solve();D.pullLever();}else if(D.phase==='ask')D.answer('h');else if(D.phase==='punch'){const p=D.P[D.cur];for(let j=0;j<50;j++)if(!p.punched.has(j)){D.punch(j);break;}}else if(D.phase==='choose')D.choose(1);return {mode:D.mode};});
  if(st.done){end=st.done;break;}await page.waitForTimeout(250);}
 check(/\$|wins|WIN|tie|heat|takes it|beats/i.test(end),`${which} plays to the result card: `+end.slice(0,100));
 const best=await page.evaluate(id=>window.ShambConkins.store.profile.soloBest?.[id]||null,which);check(best!==null,`the result is filed under ${which}`);
 await page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open)d.close();});
 }
for(const g of (process.env.GAMES||'contestants-row,range-game,safe-crackers,race-game,punch-a-bunch,clock-game,cliff-hangers,plinko-show,big-wheel').split(','))await play(g);

check(!errors.length,'no page errors '+errors.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'TPIR OK');process.exit(bad?1:0);
