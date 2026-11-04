// The Vegas tables after blackjack (engines/vegasBaccarat.js, vegasPoker.js, vegasRoulette.js on vegasGame.js): the rules in Node
// (casinoRules.js), then each table in the browser: real taps (baccarat side + chips + drag to peel, poker SHOW and discards,
// roulette chips on the layout), every table played to the result card at three screen sizes on the bots, one game vs the CPU each,
// and the dealer joining a player who broke the bank.
// Usage: node tests/casino.mjs [ids]   (SHAMB_URL=..., default http://localhost:8123/ serving a --pwa build); screenshots casino-*.png
import {launchBrowser,screenshotPath} from './lib.mjs';
import {req} from './load.mjs';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const IDS=(process.argv[2]||'bond-baccarat,five-card,roulette').split(',');
// ---- rules
{const R=req('src/engines/casinoRules.js'),C=(...a)=>a.map(([r,s])=>({r,s:s||'s'}));
 check(R.bacTotal(C([9],[8]))===7&&R.bacTotal(C([13],[1]))===1,'baccarat: totals are the last digit, picture cards count 0');
 check(R.bankerDraws(5,null)&&!R.bankerDraws(6,null)&&R.bankerDraws(3,7)&&!R.bankerDraws(3,8)&&R.bankerDraws(6,6)&&!R.bankerDraws(6,5)&&!R.bankerDraws(7,2),'baccarat: the banker’s third-card table');
 const rank=h=>R.pokerRank(C(...h));
 check(R.compareRank(rank([[1],[13],[12],[11],[10]]),rank([[9],[9,'h'],[9,'d'],[9,'c'],[2]]))>0,'poker: a royal flush beats four of a kind');
 check(R.compareRank(rank([[2],[3,'h'],[4],[5],[1,'d']]),rank([[13],[13,'h'],[12],[12,'h'],[2]]))>0&&R.handName(rank([[2],[3,'h'],[4],[5],[1,'d']]))==='Straight, Five high','poker: the wheel is a five-high straight and beats two pair');
 check(R.compareRank(rank([[13],[13,'h'],[9],[5,'h'],[2]]),rank([[13,'d'],[13,'c'],[9,'h'],[5],[3]]))<0,'poker: kickers decide equal pairs');
 check(JSON.stringify(R.drawPlan(C([2],[9,'h'],[9,'d'],[13,'c'],[4,'h'])).sort())==='[0,3,4]'&&R.drawPlan(C([2],[9],[5],[13],[4,'h']))+''==='4','poker: draw keeps a pair, keeps four to a flush');
 check(R.betReturn('n17',10,17)===360&&R.betReturn('red',10,0)===0&&R.betReturn('d3',10,25)===30&&R.betReturn('c1',10,34)===30&&R.betReturn('odd',10,7)===20&&R.betReturn('high',10,18)===0,'roulette: payouts (35, 2, 2, 1 to 1; zero loses the outside)');}
const browser=await launchBrowser();
const URL=process.env.SHAMB_URL||'http://localhost:8123/';
async function open(id,w,h,{solo=false}={}){const page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();page.__e=[];page.on('pageerror',e=>page.__e.push(e.message));
 await page.goto(URL,{timeout:180000});await page.waitForSelector('.title-screen',{timeout:90000});await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:90000});
 await page.evaluate(([id,v])=>{const S=window.ShambConkins;if(v)S.store.profile.settings.solo={on:true,who:0,level:'normal'};S.requestGame({id,origin:'arcade',solo:v,quick:true});},[id,solo]);
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.st,null,{timeout:20000});return page;}
const D=(page,fn,arg)=>page.evaluate(fn,arg);
const ui=page=>D(page,()=>{const u=window.ShambConkins.store.session?.debug?.st.ui;return u?{mode:u.mode,p:u.p}:null;});
const waitUI=(page,mode,ms=40000)=>page.waitForFunction(m=>window.ShambConkins.store.session?.debug?.st.ui?.mode===m,mode,{timeout:ms});
const origin=page=>D(page,()=>{const b=document.querySelector('.game-canvas').getBoundingClientRect();return {x:b.left,y:b.top};});
async function tapHit(page,id){const b=await D(page,id=>window.ShambConkins.store.session.debug.hits().find(h=>h.id===id),id);if(!b)return check(false,'no button '+id);const o=await origin(page);await page.mouse.click(o.x+b.X+b.w/2,o.y+b.Y+b.h/2);await page.waitForTimeout(150);}
async function toEnd(page,limit=240000){const t0=Date.now();while(Date.now()-t0<limit){const r=await D(page,()=>{const d=document.getElementById('dialog');if(d.open&&!window.ShambConkins.store.session)return d.innerText.replace(/\s+/g,' ').slice(0,220);return null;});if(r)return r;await page.waitForTimeout(400);}return '';}
const errs=page=>page.__e.filter(e=>!/wikipedia|wikimedia/i.test(e));
// ---- real taps per table
if(IDS.includes('bond-baccarat')){const page=await open('bond-baccarat',390,780);await waitUI(page,'bet');await page.waitForTimeout(400);
 await tapHit(page,'side:player');await tapHit(page,'chip:25');await tapHit(page,'chip:25');
 const o=await D(page,()=>{const d=window.ShambConkins.store.session.debug;return {sum:(d.st.ui.opts.bet||[]).reduce((a,b)=>a+b,0),side:d.st.side[0]};});check(o.sum===50&&o.side==='player','baccarat: tapping PLAYER and two $25 chips bets $50 on the player');
 await tapHit(page,'deal');await waitUI(page,'bet');await tapHit(page,'side:banker');await tapHit(page,'chip:100');await tapHit(page,'deal');
 // the biggest bettor squeezes: drag up on the big cards
 await waitUI(page,'squeeze');await page.waitForTimeout(400);await page.screenshot({path:screenshotPath('casino-bac-squeeze.png')});
 const o2=await origin(page),L=await D(page,()=>{const L=window.ShambConkins.store.session.debug.layout();return {x:L.cx,y:L.y0+L.ry*.42,h:L.ch};});
 await page.mouse.move(o2.x+L.x,o2.y+L.y+40);await page.mouse.down();await page.mouse.move(o2.x+L.x,o2.y+L.y-40-L.h*2.2,{steps:12});await page.mouse.up();await page.waitForTimeout(500);
 check((await ui(page))?.mode!=='squeeze'||(await ui(page))?.p!==undefined,'baccarat: dragging up peels the cards open');
 const peeled=await D(page,()=>{const st=window.ShambConkins.store.session.debug.st;return !st.squeeze||st.squeeze.peel>.9;});check(peeled,'baccarat: the squeeze ends once the cards are peeled');
 check(!errs(page).length,'baccarat: no page errors '+errs(page).slice(0,2).join(' | '));await page.context().close();}
if(IDS.includes('five-card')){const page=await open('five-card',390,780);await waitUI(page,'bet');await page.waitForTimeout(400);
 const hidden=await D(page,()=>!window.ShambConkins.store.session.debug.st.peek);check(hidden,'poker: on one phone your cards start face down');
 await tapHit(page,'show');check(await D(page,()=>window.ShambConkins.store.session.debug.st.peek),'poker: SHOW turns your cards up');await page.screenshot({path:screenshotPath('casino-pk-show.png')});
 // check round to the draw (bots for everyone else), then a real tap marks a discard
 await page.waitForFunction(()=>{const d=window.ShambConkins.store.session.debug,u=d.st.ui;if(!u)return false;if(u.mode==='draw')return true;if(u.mode==='bet')u.res({a:'c'});return false;},null,{timeout:60000,polling:300});
 await tapHit(page,'show');await tapHit(page,'card:0');await tapHit(page,'card:2');
 const pick=await D(page,()=>window.ShambConkins.store.session.debug.st.ui.opts.pick.slice());check(pick.length===2,'poker: tapping two cards marks them to throw away ('+pick+')');await page.screenshot({path:screenshotPath('casino-pk-draw.png')});
 await tapHit(page,'draw');await page.waitForTimeout(600);check(!errs(page).length,'poker: no page errors '+errs(page).slice(0,2).join(' | '));await page.context().close();}
if(IDS.includes('roulette')){const page=await open('roulette',390,780);await waitUI(page,'bet');await page.waitForTimeout(400);
 const o=await origin(page);const tapCell=async k=>{const q=await D(page,k=>window.ShambConkins.store.session.debug.cell(k),k);await page.mouse.click(o.x+q.X+q.w/2,o.y+q.Y+q.h/2);await page.waitForTimeout(120);};
 await tapHit(page,'chip:25');await tapCell('n17');await tapCell('red');await tapHit(page,'undo');await tapCell('odd');
 const placed=await D(page,()=>JSON.stringify(window.ShambConkins.store.session.debug.st.ui.opts.placed));check(placed==='[["n17",25],["odd",25]]','roulette: chips land where you tap, UNDO takes the last back '+placed);
 await tapHit(page,'done');check(!errs(page).length,'roulette: no page errors '+errs(page).slice(0,2).join(' | '));await page.context().close();}
// ---- each table to the result card, three sizes, on the bots
for(const id of IDS)for(const [w,h] of [[390,780],[844,390],[1100,700]]){const page=await open(id,w,h);
 await D(page,()=>{const d=window.ShambConkins.store.session.debug;d.st.auto=true;d.st.fast=true;});
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.st.phase==='result'||!window.ShambConkins.store.session,null,{timeout:90000}).catch(()=>{});await page.waitForTimeout(150);
 await page.screenshot({path:screenshotPath(`casino-${id}-${w}x${h}.png`)}).catch(()=>{});
 const end=await toEnd(page);check(/\$/.test(end),`${id} ${w}x${h}: plays to the result card: ${end.slice(0,100)}`);check(!errs(page).length,`${id} ${w}x${h}: no page errors ${errs(page).slice(0,2).join(' | ')}`);await page.context().close();}
// ---- vs the CPU, with player 1 rich: the dealer is impressed
for(const id of IDS){const page=await open(id,390,780,{solo:true});const dealer=await D(page,()=>window.ShambConkins.store.session.debug.dealerId);
 await D(page,()=>{const d=window.ShambConkins.store.session.debug;d.st.fast=true;d.st.bank[0]=2600;});
 // player 1 plays one round on the bot, then colors up; the CPU plays its own seat
 let rounds=0;const t0=Date.now();while(Date.now()-t0<120000){const r=await D(page,()=>{const S=window.ShambConkins.store;if(!S.session)return 'done';const d=S.session.debug,u=d.st.ui;if(!u)return 'wait';
   if((u.mode==='bet'&&!u.opts.noLeave||u.mode==='ready')&&d.st.round>=2){u.res({leave:1});return 'leave';}d.bot();return u.mode;});if(r==='done')break;if(r==='leave')rounds++;await page.waitForTimeout(200);}
 const end=await toEnd(page);check(/impressed/i.test(end),`${id} vs CPU: breaking the bank impresses ${dealer}: ${end.slice(0,140)}`);
 check(!errs(page).length,`${id} vs CPU: no page errors ${errs(page).slice(0,2).join(' | ')}`);await page.context().close();}
await browser.close();console.log(bad?`${bad} problem(s)`:'CASINO OK');process.exit(bad?1:0);
