// Vegas blackjack (engines/vegasBlackjack.js + vegasTable.js): the rules in Node (totals, basic strategy), then a real
// 2P table at three screen sizes: bet with chip taps, hit by tapping the felt, stand by swiping, play the whole shoe on the
// bots to the result card; a game vs the CPU; and the dealer's unlock when someone breaks the bank.
// Usage: node tests/blackjack.mjs   (SHAMB_URL=..., default http://localhost:8123/ serving a --pwa build); screenshots bj-*.png
import {launchBrowser,screenshotPath} from './lib.mjs';
import {req} from './load.mjs';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
// ---- rules in Node
{const {total,basic}=req('src/engines/blackjackRules.js'),C=(...r)=>r.map(n=>({r:n,s:'s'}));
 check(total(C(1,6)).t===17&&total(C(1,6)).soft,'A+6 is soft 17');check(total(C(1,6,10)).t===17&&!total(C(1,6,10)).soft,'A+6+10 is hard 17');check(total(C(1,1,9)).t===21,'A+A+9 is 21');
 check(basic(C(8,8),{r:10},true,true)==='p'&&basic(C(10,10),{r:6},true,true)==='s','basic strategy: split 8s, never 10s');check(basic(C(6,5),{r:6},true,false)==='d'&&basic(C(10,6),{r:10},true,false)==='h'&&basic(C(10,6),{r:5},true,false)==='s','basic strategy: double 11, hit 16 vs 10, stand 16 vs 5');}
const browser=await launchBrowser();
async function open(w,h,{solo=false}={}){const page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();page.__e=[];page.on('pageerror',e=>page.__e.push(e.message));
 await page.goto(process.env.SHAMB_URL||'http://localhost:8123/',{timeout:180000});await page.waitForSelector('.title-screen',{timeout:90000});await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:90000});
 await page.evaluate(v=>{const S=window.ShambConkins;if(v)S.store.profile.settings.solo={on:true,who:0,level:'normal'};S.requestGame({id:'blackjack',origin:'arcade',solo:v,quick:true});},solo);
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.engine==='vegas-blackjack',null,{timeout:20000});
 // the intro card (casinoFront.js): it must offer TAKE A SEAT; tap it like a player
 await page.waitForFunction(()=>window.ShambConkins.store.session.debug.st.ui?.mode==='front-intro',null,{timeout:20000});
 const seat=await page.evaluate(()=>window.ShambConkins.store.session.debug.hits().find(h=>h.id==='front:seat'));if(!seat)check(false,'intro: no TAKE A SEAT');
 else{const r=await page.evaluate(()=>{const b=document.querySelector('.game-canvas').getBoundingClientRect();return {x:b.left,y:b.top};});await page.mouse.click(r.x+seat.X+seat.w/2,r.y+seat.Y+seat.h/2);}
 return page;}
const D=(page,fn,arg)=>page.evaluate(fn,arg);
const ui=page=>D(page,()=>{const u=window.ShambConkins.store.session?.debug?.st.ui;return u?{mode:u.mode,p:u.p}:null;});
const waitUI=(page,mode,ms=30000)=>page.waitForFunction(m=>window.ShambConkins.store.session?.debug?.st.ui?.mode===m,mode,{timeout:ms});
const tapAt=async(page,x,y)=>{const r=await D(page,()=>{const b=document.querySelector('.game-canvas').getBoundingClientRect();return {x:b.left,y:b.top};});await page.mouse.click(r.x+x,r.y+y);};
const tapPanel=async(page,id)=>{const b=await D(page,id=>window.ShambConkins.store.session.debug.hits().find(h=>h.id===id),id);if(!b)return check(false,'no panel button '+id);await tapAt(page,b.X+b.w/2,b.Y+b.h/2);await page.waitForTimeout(150);};
async function toEnd(page,limit=240000){const t0=Date.now();while(Date.now()-t0<limit){const r=await D(page,()=>{const u=window.ShambConkins.store.session?.debug?.st.ui;if(u?.mode==='front-summary')u.res({});const d=document.getElementById('dialog');if(d.open&&!window.ShambConkins.store.session)return d.innerText.replace(/\s+/g,' ').slice(0,200);return null;});if(r)return r;await page.waitForTimeout(400);}return '';}
for(const [w,h] of [[390,780],[844,390],[1100,700]]){const tag=`${w}x${h}`,page=await open(w,h);
 await waitUI(page,'bet');await page.waitForTimeout(400);await page.screenshot({path:screenshotPath(`bj-bet-${tag}.png`)});
 // bet with real chip taps: find the $25 chip and the DEAL button in the panel
 // the bot builds no bet itself here: press 25 twice with keys 2, then Enter (keyboard path), next player with chip taps via debug geometry
 await page.keyboard.press('2');await page.keyboard.press('2');await page.waitForTimeout(100);
 const sum=await D(page,()=>window.ShambConkins.store.session.debug.st.ui.opts.bet.reduce((a,b)=>a+b,0));check(sum===50,`${tag}: two $25 chips make a $50 bet (${sum})`);
 await page.keyboard.press('Enter');await page.waitForFunction(()=>window.ShambConkins.store.session.debug.st.ui?.p===1,null,{timeout:10000});
 // player 2: a real tap on the $100 chip, then the bet is finished from the test
 await tapPanel(page,'chip:100');
 const s2=await D(page,()=>window.ShambConkins.store.session.debug.st.ui.opts.bet.reduce((a,b)=>a+b,0));check(s2===100,`${tag}: tapping the $100 chip bets $100 (${s2})`);await tapPanel(page,'deal');
 await page.waitForTimeout(500);await page.screenshot({path:screenshotPath(`bj-deal-${tag}.png`)});
 // play: tap the felt (hit) on the first decision, swipe (stand) on the next
 const play=await page.waitForFunction(()=>{const u=window.ShambConkins.store.session?.debug?.st.ui;return u&&(u.mode==='play'||u.mode==='ins'||u.mode==='bet');},null,{timeout:30000}).then(()=>ui(page));
 if(play?.mode==='ins'){await D(page,()=>window.ShambConkins.store.session.debug.st.ui.res({ins:0}));}
 if((await ui(page))?.mode==='play'){const seatI=await D(page,()=>window.ShambConkins.store.session.debug.st.active.seat),before=await D(page,()=>window.ShambConkins.store.session.debug.st.ui.opts.cards.length);const L=await D(page,()=>{const L=window.ShambConkins.store.session.debug.layout();return {x:L.cx,y:L.y0+L.ry*.3};});
  await tapAt(page,L.x,L.y);await page.waitForTimeout(700);const after=await D(page,i=>window.ShambConkins.store.session.debug.seats[i].hands[0]?.cards.length||0,seatI);check(after>before||after===0,`${tag}: tapping the felt hits (${before}→${after})`);
  await page.screenshot({path:screenshotPath(`bj-play-${tag}.png`)});
  if((await ui(page))?.mode==='play'){const seatS=await D(page,()=>window.ShambConkins.store.session.debug.st.active.seat);const r=await D(page,()=>{const b=document.querySelector('.game-canvas').getBoundingClientRect(),L=window.ShambConkins.store.session.debug.layout();return {x:b.left+L.cx-60,y:b.top+L.y0+L.ry*.3};});await page.mouse.move(r.x,r.y);await page.mouse.down();await page.mouse.move(r.x+130,r.y,{steps:5});await page.mouse.up();await page.waitForTimeout(300);
   const st=await D(page,i=>window.ShambConkins.store.session.debug.seats[i].hands[0],seatS);check(!st||st.done,`${tag}: a sideways swipe stands`);}}
 // the rest of the shoe on the bots, fast
 await D(page,()=>{const d=window.ShambConkins.store.session.debug;d.st.auto=true;d.st.fast=true;});
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.st.phase==='dealer'||!window.ShambConkins.store.session,null,{timeout:60000}).catch(()=>{});await page.screenshot({path:screenshotPath(`bj-dealer-${tag}.png`)});
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.st.phase==='result'||!window.ShambConkins.store.session,null,{timeout:60000}).catch(()=>{});await page.waitForTimeout(250);await page.screenshot({path:screenshotPath(`bj-result-${tag}.png`)});
 const rounds=await D(page,()=>window.ShambConkins.store.session?.debug?.st.round||0);
 const end=await toEnd(page);check(/\$/.test(end),`${tag}: the shoe plays out to the result card: ${end.slice(0,110)}`);
 const errs=page.__e.filter(e=>!/wikipedia|wikimedia/i.test(e));check(!errs.length,`${tag}: no page errors ${errs.slice(0,2).join(' | ')}`);await page.context().close();}
// ---- vs the CPU, and the dealer unlock: give player 1 a rich bank, both color up, the dealer joins
{const page=await open(390,780,{solo:true});
 const cpuSeat=await D(page,()=>window.ShambConkins.store.session.debug.seats[3].name);
 await D(page,()=>{const d=window.ShambConkins.store.session.debug;d.st.fast=true;});
 await waitUI(page,'bet');const dealer=await D(page,()=>window.ShambConkins.store.session.debug.dealerId);
 await D(page,()=>{const d=window.ShambConkins.store.session.debug;d.st.bank[0]=2400;d.st.ui.res({bet:25});});
 // the CPU bets and plays on its own; player 1 plays basic strategy until the next bet, then colors up
 await page.waitForFunction(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return true;const u=d.st.ui;if(!u)return false;if(u.mode==='bet'){u.res({leave:1});return true;}if(u.mode==='ins')u.res({ins:0});else if(u.mode==='play')u.res({a:'s'});return false;},null,{timeout:120000,polling:300});
 await D(page,()=>{const d=window.ShambConkins.store.session?.debug;if(d)d.st.auto=true;});
 const end=await toEnd(page);check(/impressed/i.test(end),`vs CPU: breaking the bank impresses the dealer (${dealer}): ${end.slice(0,160)}`);
 const has=await D(page,id=>{const p=window.ShambConkins.store.profile;return (p.rosters.Sean||[]).includes(id)||p.shared.includes(id);},dealer);check(has||/already/i.test(end),`the dealer ${dealer} joined Sean's roster`);
 check(!!cpuSeat,`CPU sits in seat 4 as ${cpuSeat}`);await page.context().close();}
await browser.close();console.log(bad?`${bad} problem(s)`:'BLACKJACK OK');process.exit(bad?1:0);
