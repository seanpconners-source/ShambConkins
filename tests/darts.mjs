// Paddy's Darts (engines/paddysDarts.js): the rules in Node (a board hit maps to the right number and ring), then a real press-and-release
// throw, 301 with a bust and a checkout, Cricket marks and scoring, High Score to the result card, and a game vs the CPU.
// Usage: node tests/darts.mjs [WxH]   (SHAMB_URL=...); screenshots: dt-*.png
import {launchBrowser,screenshotPath,appURL} from './lib.mjs';
const [w,h]=(process.argv[2]||'390x780').split('x').map(Number),tag=`${w}x${h}`;
const browser=await launchBrowser();
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
async function open(mode,{solo=false}={}){const page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();page.__e=[];page.on('pageerror',e=>page.__e.push(e.message));
 await page.goto((await appURL()),{timeout:180000});await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
 await page.evaluate(v=>{const S=window.ShambConkins;if(v)S.store.profile.settings.solo={on:true,who:0,level:'normal'};S.requestGame({id:'paddys-darts',origin:'arcade',solo:v,quick:true});},solo);
 await page.waitForSelector('.pass-overlay [data-ready]',{timeout:20000});await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]').click());await page.waitForSelector('.dt-mode',{timeout:15000});await page.waitForTimeout(250);if(mode==='x01')await page.screenshot({path:screenshotPath(`dt-menu-${tag}.png`)});
 await page.click(`.dt-mode[data-mode="${mode}"]`);return page;}
const D=(page,fn,arg)=>page.evaluate(fn,arg);
const ready=page=>page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.ready,null,{timeout:20000});
const at=(page,n,m)=>D(page,([n,m])=>{const d=window.ShambConkins.store.session.debug,[u,v]=d.spot(n,m);d.throwAt(u,v);},[n,m]);
// ---- 301: a real throw, a bust, a checkout
{const page=await open('x01');await ready(page);
 const hit=await D(page,()=>{const d=window.ShambConkins.store.session.debug;const q=[[20,3,60],[20,2,40],[20,1,20],[19,3,57],[5,1,5],[25,2,50]];return q.every(([n,m,v])=>{const [a,b]=d.spot(n,m);const r=d.hitAt(a,b);return r.v===v;})&&d.hitAt(0,.06).v===25&&d.hitAt(1.2,0).v===0;});check(hit,'the board maps spots to the right numbers and rings');
 const G=await D(page,()=>{const g=window.ShambConkins.store.session.debug.geo(),r=document.querySelector('.game-canvas').getBoundingClientRect();return {cx:g.cx+r.left,cy:g.cy+r.top};});
 await page.mouse.move(G.cx,G.cy+48);await page.mouse.down();await page.waitForTimeout(300);await page.screenshot({path:screenshotPath(`dt-aim-${tag}.png`)});await page.mouse.up();await page.waitForTimeout(900);
 check(await D(page,()=>window.ShambConkins.store.session.debug.remain[0]<301),'hold and release throws a dart that scores');await page.screenshot({path:screenshotPath(`dt-board-${tag}.png`)});
 await D(page,()=>{window.ShambConkins.store.session.debug.remain[0]=301;});await ready(page);
 // make player 1's next visit a bust: 10 left at the start of a visit, a 20 is too much
 await at(page,1,1);await ready(page);await at(page,1,1);await page.waitForFunction(()=>window.ShambConkins.store.session.debug.turn===1,null,{timeout:20000});for(let k=0;k<3;k++){await ready(page);await at(page,1,1);await page.waitForTimeout(100);}
 await page.waitForFunction(()=>window.ShambConkins.store.session.debug.turn===0,null,{timeout:20000});await D(page,()=>{window.ShambConkins.store.session.debug.remain[0]=10;});await ready(page);
 await D(page,()=>{});const was=await D(page,()=>window.ShambConkins.store.session.debug.remain[0]);await at(page,20,1);await page.waitForFunction(()=>window.ShambConkins.store.session.debug.turn===1,null,{timeout:20000});
 check((await D(page,()=>window.ShambConkins.store.session.debug.remain[0]))>=was-0&&was>0,'going under zero is a bust: the score goes back');
 for(let k=0;k<3;k++){await ready(page);await at(page,1,1);await page.waitForTimeout(100);}
 await page.waitForFunction(()=>window.ShambConkins.store.session.debug.turn===0,null,{timeout:20000});await D(page,()=>{window.ShambConkins.store.session.debug.remain[0]=40;});await ready(page);await at(page,20,2);
 const end=await page.waitForFunction(()=>document.getElementById('dialog').open,null,{timeout:30000}).then(()=>page.evaluate(()=>document.getElementById('dialog').innerText.replace(/\s+/g,' ').slice(0,120)),()=>'');check(/301/.test(end)&&/Sean/.test(end),'a checkout on exactly zero wins: '+end);check(!page.__e.length,'301: no page errors '+page.__e.slice(0,2).join(' | '));}
// ---- Cricket
{const page=await open('cricket');await ready(page);await at(page,20,3);await page.waitForTimeout(700);check((await D(page,()=>window.ShambConkins.store.session.debug.marks[0][20]))===3,'a treble 20 closes the 20 in Cricket');
 await ready(page);await at(page,20,3);await page.waitForTimeout(700);check((await D(page,()=>window.ShambConkins.store.session.debug.pts[0]))===60,'more marks on a closed number score points');
 await ready(page);await at(page,5,1);await page.waitForTimeout(600);check((await D(page,()=>window.ShambConkins.store.session.debug.marks[0][5]===undefined)),'numbers outside 15 to 20 and the bull do nothing');await page.screenshot({path:screenshotPath(`dt-cricket-${tag}.png`)});check(!page.__e.length,'Cricket: no page errors');}
// ---- High Score vs the CPU, played to the end
{const page=await open('high',{solo:true});const t0=Date.now();let end='';while(Date.now()-t0<200000){const r=await D(page,()=>{const S=window.ShambConkins.store,d=document.getElementById('dialog');if(d.open&&!S.session)return d.innerText.replace(/\s+/g,' ').slice(0,120);S.session?.debug?.bot?.();return '';});if(r){end=r;break;}await page.waitForTimeout(250);}check(/High Score|beats|CPU/.test(end),'High Score vs the CPU reaches the result: '+end);check(!page.__e.length,'High Score: no page errors '+page.__e.slice(0,2).join(' | '));}
await browser.close();console.log(bad?`${bad} problem(s)`:'DARTS OK');process.exit(bad?1:0);
