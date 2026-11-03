// Who Wants to Be a Shambillionaire? (engines/millionaire.js): P1 climbs past the first safe haven, uses all three lifelines,
// answers wrong and drops to $1,000; P2 takes one question and walks away with $100; the higher bank wins.
// Usage: node tests/millionaire.mjs [WxH]   (SHAMB_URL=http://localhost:8123/ for a --pwa build); screenshots: wm-*.png
import {launchBrowser,screenshotPath} from './lib.mjs';
const [w,h]=(process.argv[2]||'390x780').split('x').map(Number),tag=`${w}x${h}`;
const browser=await launchBrowser(),page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
await page.goto(process.env.SHAMB_URL||'http://localhost:8123/',{timeout:180000});await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
const D=fn=>page.evaluate(fn);
const asking=()=>page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.st?.phase==='ask'&&!document.querySelector('.wm-end'),null,{timeout:30000});
const ready=()=>page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());
await D(()=>{window.ShambConkins.requestGame({id:'trivia-hardcore',origin:'arcade',quick:true});});
await page.waitForSelector('.pass-overlay [data-ready]',{timeout:20000});await ready();
for(let r=0;r<6;r++){await asking();
 if(r===0){check((await D(()=>document.querySelectorAll('.wm-a').length))===4,'four answers');check((await D(()=>document.querySelectorAll('.wm-tree li').length))===15,'a 15-rung ladder');check((await D(()=>!!document.querySelector('[data-walk]:disabled'))),'nothing to walk away with on question 1');await page.screenshot({path:screenshotPath(`wm-q1-${tag}.png`)});}
 await D(()=>window.ShambConkins.store.session.debug.answerRight());await page.waitForTimeout(300);}
await asking();
check((await D(()=>window.ShambConkins.store.session.debug.scores[0]))===2000,'six right answers show $2,000');
// the three lifelines on question 7
await page.click('[data-life="fifty"]');check((await D(()=>document.querySelectorAll('.wm-a.gone').length))===2,'50:50 takes away two answers');
check(await D(()=>{const q=window.ShambConkins.store.session.debug.st;return !q.gone.has(q.q.correct);}),'50:50 never removes the right answer');
await page.click('[data-life="aud"]');check((await D(()=>document.querySelectorAll('.wm-aud div').length))===4,'Ask the Audience shows a bar per answer');await page.waitForTimeout(1000);await page.screenshot({path:screenshotPath(`wm-audience-${tag}.png`)});
await page.click('[data-life="tel"]');check((await D(()=>/sure it/.test(document.querySelector('.wm-host').textContent))),'Phone a Friend gives an answer');await page.screenshot({path:screenshotPath(`wm-friend-${tag}.png`)});
check((await D(()=>document.querySelectorAll('[data-life]:disabled').length))===3,'each lifeline works once');
const over=await D(()=>{const pills=document.querySelector('.game-actions')?.getBoundingClientRect(),tree=document.querySelector('.wm-tree').getBoundingClientRect(),top=document.querySelector('.wm-top').getBoundingClientRect(),q=document.querySelector('.wm-q').getBoundingClientRect();return {sideways:document.documentElement.scrollWidth>innerWidth+1,under:!!pills&&pills.bottom>top.top+1&&pills.bottom>tree.top+1,off:q.bottom>innerHeight+1,row:tree.height/15};});
check(!over.sideways&&!over.off&&!over.under,'the screen fits '+tag+' '+JSON.stringify(over));check(over.row>=13,'ladder rows are readable '+Math.round(over.row)+' px');
// wrong answer: back to the last safe haven
await D(()=>{const S=window.ShambConkins.store.session.debug.st,w=S.order.find(i=>i!==S.q.correct&&!S.gone.has(i));document.querySelector(`[data-a="${w}"]`).click();});
await page.waitForTimeout(100);check((await D(()=>/final answer/.test(document.querySelector('.wm-host').textContent))),'the host asks "is that your final answer?"');await page.screenshot({path:screenshotPath(`wm-final-${tag}.png`)});
await page.click('[data-final]');
await page.waitForSelector('.pass-overlay [data-ready]',{timeout:30000});
check((await D(()=>window.ShambConkins.store.session.score?.[0]??window.ShambConkins.store.session.debug.scores[0]))===1000,'a wrong answer on question 7 drops to $1,000');
await ready();await asking();await D(()=>window.ShambConkins.store.session.debug.answerRight());await page.waitForTimeout(300);await asking();
await page.click('[data-walk]');
await page.waitForFunction(()=>!window.ShambConkins.store.session||document.getElementById('dialog').open,null,{timeout:30000});
const end=await D(()=>document.getElementById('dialog').innerText?.slice(0,200)||'');check(/1,000|1000/.test(end)&&/100/.test(end),'the result card shows both banks: '+end.replace(/\s+/g,' ').slice(0,120));
check(!errors.length,'no page errors '+errors.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'MILLIONAIRE OK');process.exit(bad?1:0);
