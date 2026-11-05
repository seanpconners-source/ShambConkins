// Major League Baseball (engines/griffeyBall.js + baseballRules.js + griffeyArt.js): the rules and physics in Node, then the
// game in the browser: picking a pitch and tapping where to throw it, holding to aim and letting go to swing, the innings
// menu, a whole game on the bots at three screen sizes, a game vs the CPU, and the Home Run Derby.
// Usage: node tests/baseball.mjs   (SHAMB_URL=..., default http://localhost:8123/ serving a --pwa build); screenshots bb-*.png
import {launchBrowser,screenshotPath} from './lib.mjs';
import {req} from './load.mjs';
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
// ---- rules
{const R=req('src/engines/baseballRules.js'),D=Math.PI/180;
 const hr=R.flight({mph:108,phi:28,theta:0}),liner=R.flight({mph:95,phi:12,theta:20*D}),dribbler=R.flight({mph:70,phi:-10,theta:-10*D});
 check(hr.hr&&hr.dist>395,`a 108 mph drive at 28° is a home run (${Math.round(hr.dist)} ft)`);
 check(!liner.hr&&!liner.foul&&liner.landed&&liner.dist>120&&liner.dist<260,`a 95 mph liner lands in the outfield (${Math.round(liner.dist||0)} ft)`);
 check(!dribbler.hr&&Math.hypot(dribbler.path.at(-1)[1],dribbler.path.at(-1)[2])<170,'a chopper stops on the infield');
 check(R.flight({mph:100,phi:25,theta:60*D}).foul,'a ball hooked past the line is foul');
 const p={u:0,v:0,kind:'fast'};check(R.contact(p,0,0,0,{power:.6,contact:.6},()=>.5).kind==='fair','a perfectly timed swing on the sweet spot is in play');
 check(R.contact(p,.2,0,0,{power:.6,contact:.6},()=>.5).kind==='miss'&&R.contact(p,0,1.2,0,{power:.6,contact:.6},()=>.5).kind==='miss','too late, or the bat in the wrong place, misses');
 const early=R.contact(p,-.07,0,0,{power:.6,contact:.6},()=>.5),late=R.contact(p,.07,0,0,{power:.6,contact:.6},()=>.5);check(early.theta<0&&late.theta>0,'early pulls it to left field, late goes the other way');
 let c=R.newCount();for(const r of ['ball','ball','ball'])c=R.tally(c,r).count;check(R.tally(c,'ball').walk,'four balls is a walk');
 c=R.newCount();for(const r of ['foul','foul','foul','foul'])c=R.tally(c,r).count;check(c.s===2,'fouls with two strikes keep the count');check(R.tally(c,'swing').k,'strike three');
 check(JSON.stringify(R.walk([true,true,true]))===JSON.stringify({bases:[true,true,true],runs:1}),'a walk with the bases loaded forces a run in');
 const fly=R.flight({mph:85,phi:40,theta:0}),cf=R.POSITIONS[7],it=R.intercept(fly,cf.x,cf.y,27);check(it.air,'the centre fielder runs down a lazy fly ball');}
const browser=await launchBrowser();
const URL=process.env.SHAMB_URL||'http://localhost:8123/';
async function open(id,w,h,{solo=false,arcade=true}={}){const page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();page.__e=[];page.on('pageerror',e=>page.__e.push(e.message));
 await page.goto(URL,{timeout:180000});await page.waitForSelector('.title-screen',{timeout:90000});await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:90000});
 await page.evaluate(([id,v,arc])=>{const S=window.ShambConkins;S.store.arcade=arc;if(v)S.store.profile.settings.solo={on:true,who:0,level:'normal'};S.requestGame({id,origin:'arcade',solo:v,quick:true});},[id,solo,arcade]);
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.engine==='griffey',null,{timeout:20000});return page;}
const D=(page,fn,arg)=>page.evaluate(fn,arg);
const origin=page=>D(page,()=>{const b=document.querySelector('.game-canvas').getBoundingClientRect();return {x:b.left,y:b.top};});
async function tapHit(page,id){const b=await D(page,id=>window.ShambConkins.store.session.debug.hits().find(h=>h.id===id),id);if(!b)return check(false,'no button '+id);const o=await origin(page);await page.mouse.click(o.x+b.X+b.w/2,o.y+b.Y+b.h/2);await page.waitForTimeout(150);}
async function toEnd(page,limit=300000){const t0=Date.now();while(Date.now()-t0<limit){const r=await D(page,()=>{const d=document.getElementById('dialog');if(d.open&&!window.ShambConkins.store.session)return d.innerText.replace(/\s+/g,' ').slice(0,200);return null;});if(r)return r;await page.waitForTimeout(400);}return '';}
const errs=page=>page.__e.filter(e=>!/wikipedia|wikimedia/i.test(e));
// ---- real input: the innings menu, a pitch, a swing
{const page=await open('major-league-fielding',390,780);
 await page.waitForFunction(()=>window.ShambConkins.store.session.debug.st.ui?.mode==='innings',null,{timeout:15000});await page.waitForTimeout(300);await page.screenshot({path:screenshotPath('bb-menu.png')});
 await tapHit(page,'inn:3');check(await D(page,()=>window.ShambConkins.store.session.debug.st.innings)===3,'tapping 3 INNINGS sets a three-inning game');
 // player 2's team fields first (top half of the screen): drag along the rubber, then pick a curve
 await page.waitForFunction(()=>window.ShambConkins.store.session.debug.st.ui?.mode==='pitch',null,{timeout:15000});const o=await origin(page);
 await page.mouse.move(o.x+195,o.y+200);await page.mouse.down();await page.mouse.move(o.x+255,o.y+200,{steps:6});await page.mouse.up();
 check(await D(page,()=>window.ShambConkins.store.session.debug.st.rubber)>.2,'dragging in the pitcher half moves him along the rubber');
 await tapHit(page,'pitch:curve');
 await page.waitForFunction(()=>window.ShambConkins.store.session.debug.st.pitch,null,{timeout:5000});check(await D(page,()=>window.ShambConkins.store.session.debug.st.pitch.plan.kind)==='curve','tapping CURVE throws a curve');
 // aftertouch: drag in the pitcher half while the ball is coming
 await page.mouse.move(o.x+200,o.y+250);await page.mouse.down();await page.mouse.move(o.x+140,o.y+230,{steps:5});
 const sv=await D(page,()=>window.ShambConkins.store.session.debug.st.pitch.steer);check(sv&&sv.u<-.1,`dragging during the pitch steers it (${JSON.stringify(sv)})`);await page.mouse.up();
 // the batter (bottom half): drag on the left to move in the box, then tap on the right to swing as the ball arrives
 await page.mouse.move(o.x+80,o.y+680);await page.mouse.down();await page.mouse.move(o.x+130,o.y+660,{steps:5});await page.mouse.up();
 check(await D(page,()=>window.ShambConkins.store.session.debug.st.bx.x)>.2,'dragging on the left moves the batter toward the plate');
 const arrive=await D(page,()=>{const d=window.ShambConkins.store.session.debug;return d.st.pitch.arrive-d.T;});await page.waitForTimeout(Math.max(0,arrive*1000-150));
 await page.screenshot({path:screenshotPath('bb-aim.png')});await page.mouse.click(o.x+330,o.y+690);await page.waitForTimeout(60);
 check(await D(page,()=>!!window.ShambConkins.store.session.debug.st.swing||window.ShambConkins.store.session.debug.st.res),'tapping on the right swings the bat');
 await page.waitForTimeout(900);await page.screenshot({path:screenshotPath('bb-after-swing.png')});check(!errs(page).length,'menu/pitch/swing: no page errors '+errs(page).slice(0,2).join(' | '));await page.context().close();}
// ---- a whole game on the bots, three sizes (one inning)
for(const [w,h] of [[390,780],[844,390],[1100,700]]){const page=await open('major-league-fielding',w,h);
 await D(page,()=>{const d=window.ShambConkins.store.session.debug;d.st.auto=true;d.st.fast=true;});
 await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.st.view==='field'||!window.ShambConkins.store.session,null,{timeout:120000}).catch(()=>{});await page.waitForTimeout(120);await page.screenshot({path:screenshotPath(`bb-field-${w}x${h}.png`)}).catch(()=>{});
 const end=await toEnd(page);check(/Major League Baseball/.test(end),`${w}x${h}: a game plays to the result card: ${end.slice(0,90)}`);check(!errs(page).length,`${w}x${h}: no page errors ${errs(page).slice(0,2).join(' | ')}`);await page.context().close();}
// ---- vs the CPU (board-style: one inning, no menu)
{const page=await open('major-league-fielding',390,780,{solo:true,arcade:false});await D(page,()=>{const d=window.ShambConkins.store.session.debug;d.st.auto=true;d.st.fast=true;});
 const end=await toEnd(page);check(/1 inning|innings/.test(end)&&/CPU/.test(end),`vs CPU: one inning to the result: ${end.slice(0,110)}`);check(!errs(page).length,'vs CPU: no page errors '+errs(page).slice(0,2).join(' | '));await page.context().close();}
// ---- the Home Run Derby
{const page=await open('major-league-bats',390,780);await D(page,()=>{const d=window.ShambConkins.store.session.debug;d.st.auto=true;d.st.fast=true;});
 const end=await toEnd(page);check(/Home Run Derby/.test(end),`Derby to the result: ${end.slice(0,120)}`);check(!errs(page).length,'Derby: no page errors '+errs(page).slice(0,2).join(' | '));await page.context().close();}
await browser.close();console.log(bad?`${bad} problem(s)`:'BASEBALL OK');process.exit(bad?1:0);
